import json
import os
import re
import shutil
import time
import uuid
from typing import Optional
from urllib import request as urlrequest

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi import Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from database import engine, get_db
import models
import ranker
from tasks import process_application_task

models.Base.metadata.create_all(bind=engine)


# Ensure public UUID identifiers exist for IDOR-resistant API exposure.
def ensure_public_id_columns():
    inspector = inspect(engine)

    with engine.begin() as conn:
        job_columns = {col["name"] for col in inspector.get_columns("jobs")}
        if "public_id" not in job_columns:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN public_id VARCHAR(36)"))

        app_columns = {col["name"] for col in inspector.get_columns("applications")}
        if "public_id" not in app_columns:
            conn.execute(text("ALTER TABLE applications ADD COLUMN public_id VARCHAR(36)"))

        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_public_id ON jobs(public_id)"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_public_id ON applications(public_id)"))

        missing_jobs = conn.execute(text("SELECT id FROM jobs WHERE public_id IS NULL OR public_id = ''")).mappings().all()
        for row in missing_jobs:
            conn.execute(
                text("UPDATE jobs SET public_id = :pid WHERE id = :id"),
                {"pid": str(uuid.uuid4()), "id": row["id"]},
            )

        missing_apps = conn.execute(
            text("SELECT id FROM applications WHERE public_id IS NULL OR public_id = ''")
        ).mappings().all()
        for row in missing_apps:
            conn.execute(
                text("UPDATE applications SET public_id = :pid WHERE id = :id"),
                {"pid": str(uuid.uuid4()), "id": row["id"]},
            )


ensure_public_id_columns()

app = FastAPI(title="Resume Ranking API")

security_log_webhook_url = os.getenv("SECURITY_LOG_WEBHOOK_URL", "")
max_resume_size_mb = int(os.getenv("MAX_RESUME_UPLOAD_MB", "10"))


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
        req = urlrequest.Request(
            security_log_webhook_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urlrequest.urlopen(req, timeout=2)
    except Exception:
        # Security telemetry should never break primary request flow.
        pass


@app.middleware("http")
async def security_middleware(req: Request, call_next):
    started = time.time()
    res = await call_next(req)

    # Security hardening headers.
    res.headers["X-Content-Type-Options"] = "nosniff"
    res.headers["X-Frame-Options"] = "DENY"
    res.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    res.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    path = req.url.path or ""
    if path.startswith("/auth") or path.startswith("/admin"):
        _emit_security_event(
            {
                "category": "AUTH_ADMIN_ATTEMPT",
                "method": req.method,
                "path": path,
                "status_code": res.status_code,
                "ip": req.client.host if req.client else "",
                "user_agent": req.headers.get("user-agent", ""),
                "latency_ms": int((time.time() - started) * 1000),
            }
        )

    return res


def _resolve_job(db: Session, job_ref: str):
    job = None
    if job_ref.isdigit():
        job = db.query(models.Job).filter(models.Job.id == int(job_ref)).first()
    if not job:
        job = db.query(models.Job).filter(models.Job.public_id == job_ref).first()
    return job


def _resolve_application(db: Session, application_ref: str):
    application = None
    if application_ref.isdigit():
        application = db.query(models.Application).filter(models.Application.id == int(application_ref)).first()
    if not application:
        application = db.query(models.Application).filter(models.Application.public_id == application_ref).first()
    return application


def _serialize_application(application: models.Application):
    shortlisted, shortlist_reason = _shortlist_decision(application)
    return {
        "id": application.public_id,
        "legacy_id": application.id,
        "job_id": application.job.public_id if application.job else None,
        "job_legacy_id": application.job_id,
        "name": application.name,
        "email": application.email,
        "phone": application.phone,
        "status": application.status,
        "score": application.score,
        "semantic_score": application.semantic_score,
        "keyword_score": application.keyword_score,
        "heuristic_score": application.heuristic_score,
        "rationale": application.rationale,
        "processing_error": application.processing_error,
        "shortlisted": shortlisted,
        "shortlist_reason": shortlist_reason,
        "created_at": application.created_at.isoformat() if application.created_at else None,
        "updated_at": application.updated_at.isoformat() if application.updated_at else None,
    }


def _shortlist_decision(application: models.Application):
    if application.status != "RANKED":
        return False, "Application is not ranked yet."

    score = application.score or 0.0
    semantic = application.semantic_score or 0.0
    skill_fit = application.keyword_score or 0.0

    reasons = []
    if score < 50:
        reasons.append(f"final score {score:.2f}% is below shortlist threshold (50%).")
    if skill_fit < 50:
        reasons.append(f"required-skill fit {skill_fit:.2f}% is below threshold (50%).")
    if semantic < 55:
        reasons.append(f"semantic match {semantic:.2f}% is below threshold (55%).")

    if reasons:
        return False, " ".join(reasons)
    return True, "Meets shortlist criteria."


@app.get("/health")
def healthcheck():
    return {"ok": True, "engine": "background-tasks"}


@app.post("/jobs/")
def create_job(title: str = Form(...), description: str = Form(...), db: Session = Depends(get_db)):
    try:
        vector = ranker.encode_text(description)
        job = models.Job(title=title, description=description, jd_vector=vector)
        db.add(job)
        db.commit()
        db.refresh(job)

        return {
            "id": job.public_id,
            "legacy_id": job.id,
            "title": job.title,
            "description": job.description,
            "message": "Job created successfully",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/jobs/{job_ref}")
def get_job(job_ref: str, db: Session = Depends(get_db)):
    job = _resolve_job(db, job_ref)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "id": job.public_id,
        "legacy_id": job.id,
        "title": job.title,
        "description": job.description,
    }


@app.post("/jobs/{job_ref}/applications/")
async def submit_application(
    job_ref: str,
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(default=None),
    profile_text: Optional[str] = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    job = _resolve_job(db, job_ref)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    filename = file.filename or "resume.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported")

    if file.content_type and file.content_type not in {"application/pdf", "application/x-pdf", "binary/octet-stream"}:
        raise HTTPException(status_code=400, detail="Unsupported file content type")

    upload_dir = "uploaded_resumes"
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", os.path.basename(filename))
    stored_filename = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(upload_dir, stored_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
    if file_size_mb > max_resume_size_mb:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Resume exceeds max size of {max_resume_size_mb}MB")

    application = models.Application(
        job_id=job.id,
        name=name,
        email=email,
        phone=phone,
        profile_text=profile_text,
        resume_file_path=os.path.abspath(file_path),
        status="RECEIVED",
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    background_tasks.add_task(process_application_task, application.id)

    return {
        "application_id": application.public_id,
        "legacy_application_id": application.id,
        "status": application.status,
        "message": "Application submitted and queued for ranking",
    }


@app.get("/applications/{application_ref}")
def get_application(application_ref: str, db: Session = Depends(get_db)):
    application = _resolve_application(db, application_ref)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return _serialize_application(application)


@app.get("/jobs/{job_ref}/applications")
def list_applications(job_ref: str, db: Session = Depends(get_db)):
    job = _resolve_job(db, job_ref)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rows = (
        db.query(models.Application)
        .filter(models.Application.job_id == job.id)
        .order_by(models.Application.score.desc().nullslast(), models.Application.created_at.asc())
        .all()
    )

    return [_serialize_application(row) for row in rows]


@app.get("/jobs/{job_ref}/leaderboard")
def get_leaderboard(job_ref: str, db: Session = Depends(get_db)):
    job = _resolve_job(db, job_ref)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ranked = (
        db.query(models.Application)
        .filter(models.Application.job_id == job.id, models.Application.status == "RANKED")
        .order_by(models.Application.score.desc(), models.Application.created_at.asc())
        .all()
    )

    pending_count = (
        db.query(models.Application)
        .filter(models.Application.job_id == job.id, models.Application.status.in_(["RECEIVED", "PROCESSING"]))
        .count()
    )

    failed_count = (
        db.query(models.Application)
        .filter(models.Application.job_id == job.id, models.Application.status == "FAILED")
        .count()
    )

    serialized_ranked = [_serialize_application(row) for row in ranked]

    def rerank_key(candidate):
        # Balance overall score with semantic + required-skill fit.
        final_s = float(candidate.get("score") or 0.0)
        semantic = float(candidate.get("semantic_score") or 0.0)
        skill = float(candidate.get("keyword_score") or 0.0)
        balanced = (final_s * 0.65) + (semantic * 0.20) + (skill * 0.15)
        return balanced

    serialized_ranked.sort(key=rerank_key, reverse=True)
    shortlisted = [row for row in serialized_ranked if row["shortlisted"]]
    non_shortlisted = [row for row in serialized_ranked if not row["shortlisted"]]

    return {
        "job": {"id": job.public_id, "legacy_id": job.id, "title": job.title},
        "top_5": shortlisted[:5],
        "others": shortlisted[5:] + non_shortlisted,
        "total_ranked": len(serialized_ranked),
        "shortlisted_count": len(shortlisted),
        "pending_count": pending_count,
        "failed_count": failed_count,
    }


# Legacy endpoint retained for old frontend contract.
@app.get("/results/{job_ref}")
def get_results(job_ref: str, db: Session = Depends(get_db)):
    job = _resolve_job(db, job_ref)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rows = (
        db.query(models.Application)
        .filter(models.Application.job_id == job.id, models.Application.status == "RANKED")
        .order_by(models.Application.score.desc())
        .all()
    )

    return [
        {
            "id": row.name,
            "final_score": row.score,
            "breakdown": {
                "semantic": row.semantic_score,
                "keyword": row.keyword_score,
                "heuristic": row.heuristic_score,
            },
            "rationale": row.rationale,
        }
        for row in rows
    ]
