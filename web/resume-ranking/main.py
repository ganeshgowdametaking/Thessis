import json
import time

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os
import parser
import ranker
import supabase_client
from auth import get_current_user_id
from scoring import score_application

app = FastAPI(title="Resume Ranking API")

security_log_webhook_url = os.getenv("SECURITY_LOG_WEBHOOK_URL", "")

default_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://tanktide.com",
    "https://www.tanktide.com",
]
configured_origins = os.getenv("CORS_ALLOW_ORIGINS", "")
allowed_origins = [origin.strip() for origin in configured_origins.split(",") if origin.strip()] or default_origins
allow_origin_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX", r"^https://.*\.vercel\.app$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _emit_security_event(event: dict):
    payload = {
        **event,
        "service": "resume-ranking",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    print("[SECURITY_EVENT]", json.dumps(payload, separators=(",", ":")))

    if not security_log_webhook_url:
        return

    try:
        import httpx

        httpx.post(security_log_webhook_url, json=payload, timeout=2)
    except Exception:
        # Security telemetry should never break primary request flow.
        pass


@app.middleware("http")
async def security_middleware(req: Request, call_next):
    started = time.time()
    res = await call_next(req)

    res.headers["X-Content-Type-Options"] = "nosniff"
    res.headers["X-Frame-Options"] = "DENY"
    res.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    res.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    if req.url.path.startswith("/applications/"):
        _emit_security_event(
            {
                "category": "RANKING_REQUEST",
                "method": req.method,
                "path": req.url.path,
                "status_code": res.status_code,
                "ip": req.client.host if req.client else "",
                "user_agent": req.headers.get("user-agent", ""),
                "latency_ms": int((time.time() - started) * 1000),
            }
        )

    return res


@app.get("/health")
def healthcheck():
    return {"ok": True, "engine": "synchronous"}


class RankingResult(BaseModel):
    application_id: str
    score: float
    semantic_score: float
    skill_score: float
    rationale: str


@app.post("/applications/{application_id}/rank", response_model=RankingResult)
def rank_application(application_id: str, caller_id: str = Depends(get_current_user_id)):
    """Scores one real Thessis application against its job description and
    writes the result straight onto applications.ai_* columns.

    Synchronous by design: this is regex/keyword scoring, not an LLM call,
    so there's no long-running work to background — and a fire-and-forget
    background task would be unreliable on a scale-to-zero host anyway (the
    instance can be recycled between the response and the task finishing).
    The service-role RPCs check the verified caller's job ownership or live
    referrer assignment both before reading private inputs and before saving.
    """
    try:
        record = supabase_client.get_application_for_ranking(application_id, caller_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Supabase: {exc}")

    if not record:
        raise HTTPException(status_code=404, detail="Application not found or access denied")

    if not record.get("resume_url"):
        raise HTTPException(status_code=422, detail="Applicant has no resume on file")

    try:
        resume_bytes = supabase_client.download_resume(record["resume_url"], record["applicant_id"])
    except supabase_client.ResumeUnavailableError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.public_message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not download resume: {exc}")

    parsed = parser.process_resume(resume_bytes)
    if not parsed:
        raise HTTPException(status_code=422, detail="Failed to parse resume PDF")

    resume_text = "\n".join(
        [
            parsed["sections"].get("summary", ""),
            parsed["sections"].get("experience", ""),
            parsed["sections"].get("skills", ""),
            parsed["sections"].get("education", ""),
            parsed["sections"].get("projects", ""),
        ]
    ).strip()

    job_vector = ranker.encode_text(record["job_description"] or "")

    scoring = score_application(
        job_description=record["job_description"] or "",
        job_vector=job_vector,
        resume_text=resume_text,
        profile_text=record.get("profile_text"),
        resume_sections=parsed.get("sections"),
    )

    try:
        saved = supabase_client.save_application_ranking(
            application_id=application_id,
            caller_id=caller_id,
            score=scoring["score"],
            semantic_score=scoring["semantic_score"],
            skill_score=scoring["keyword_score"],
            rationale=scoring["rationale"],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Scored, but could not save result: {exc}")

    if not saved:
        raise HTTPException(status_code=403, detail="Ranking access expired or was revoked")

    return RankingResult(
        application_id=application_id,
        score=scoring["score"],
        semantic_score=scoring["semantic_score"],
        skill_score=scoring["keyword_score"],
        rationale=scoring["rationale"],
    )
