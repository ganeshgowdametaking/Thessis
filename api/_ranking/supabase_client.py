import json
import os
import urllib.error
import urllib.request
from typing import Optional

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _require_configured():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        )


def _auth_headers() -> dict:
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
    }


def _post_json(url: str, body: dict, timeout: int = 15) -> tuple:
    """Plain urllib POST — avoids adding httpx as a dependency, which keeps
    this serverless function's package smaller (every extra dependency is
    real risk against Vercel's function size ceiling)."""
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=_auth_headers(),
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()


def get_application_for_ranking(application_id: str) -> Optional[dict]:
    """Calls the get_application_for_ranking() Postgres RPC (service-role
    only, see supabase/migrations/20260910090000_applicant_ranking_columns_and_rpcs.sql)
    for the job description, resume URL, and profile text needed to score
    one real Thessis application. Returns None if the application doesn't
    exist."""
    _require_configured()

    status, body = _post_json(
        f"{SUPABASE_URL}/rest/v1/rpc/get_application_for_ranking",
        {"p_application_id": application_id},
    )
    if status != 200:
        raise RuntimeError(f"get_application_for_ranking failed ({status}): {body.decode(errors='replace')}")

    rows = json.loads(body)
    return rows[0] if rows else None


def save_application_ranking(
    application_id: str,
    score: float,
    semantic_score: float,
    skill_score: float,
    rationale: str,
) -> None:
    """Calls the save_application_ranking() Postgres RPC to persist one
    application's score directly onto the real applications table."""
    _require_configured()

    status, body = _post_json(
        f"{SUPABASE_URL}/rest/v1/rpc/save_application_ranking",
        {
            "p_application_id": application_id,
            "p_score": score,
            "p_semantic_score": semantic_score,
            "p_skill_score": skill_score,
            "p_rationale": rationale,
        },
    )
    if status not in (200, 204):
        raise RuntimeError(f"save_application_ranking failed ({status}): {body.decode(errors='replace')}")


class ResumeUnavailableError(Exception):
    """A resume couldn't be retrieved. Carries a short, human-readable
    message safe to show a referrer on the Applications page — the raw
    upstream detail (which can be an entire HTML error page or a Supabase
    storage JSON error) is logged server-side via print() for debugging,
    never surfaced to the browser."""

    def __init__(self, public_message: str, status_code: int = 422, detail: str = ""):
        super().__init__(public_message)
        self.public_message = public_message
        self.status_code = status_code
        if detail:
            print(f"[resume_unavailable_detail] {detail}")


def _is_valid_resume_source(resume_url: str) -> bool:
    # Two legitimate formats coexist in this column: newer applications point
    # at the real `resumes` Storage bucket, but applications from before that
    # bucket existed still store the resume as an inline base64 data URI
    # directly in resume_url — urllib.request handles `data:` natively, so
    # this only needs to let it through, not decode it specially.
    if resume_url.startswith("data:application/pdf"):
        return True
    return bool(SUPABASE_URL) and resume_url.startswith(f"{SUPABASE_URL}/storage/")


def download_resume(resume_url: str) -> bytes:
    """Resumes live in the public `resumes` Storage bucket, so this is a
    plain GET — no service-role auth needed to read them back."""
    if not _is_valid_resume_source(resume_url):
        raise ResumeUnavailableError(
            "Resume link is invalid — it doesn't point to a file in Thessis storage.",
            detail=f"resume_url did not match {SUPABASE_URL}/storage/*: {resume_url}",
        )

    req = urllib.request.Request(resume_url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return res.read()
    except urllib.error.HTTPError as exc:
        raise ResumeUnavailableError(
            "Resume file could not be found — it may have been deleted or moved.",
            detail=f"HTTP {exc.code}: {exc.read().decode(errors='replace')}",
        )
    except Exception as exc:
        raise ResumeUnavailableError(
            "Resume file could not be retrieved due to a network error.",
            status_code=502,
            detail=str(exc),
        )
