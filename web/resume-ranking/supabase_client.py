import os
from typing import Optional

import httpx

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


def get_application_for_ranking(application_id: str) -> Optional[dict]:
    """Calls the get_application_for_ranking() Postgres RPC (service-role
    only, see supabase/migrations/20260910090000_applicant_ranking_columns_and_rpcs.sql)
    for the job description, resume URL, and profile text needed to score
    one real Thessis application. Returns None if the application doesn't
    exist."""
    _require_configured()

    with httpx.Client(timeout=15) as client:
        res = client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/get_application_for_ranking",
            headers=_auth_headers(),
            json={"p_application_id": application_id},
        )
        if res.status_code != 200:
            raise RuntimeError(f"get_application_for_ranking failed ({res.status_code}): {res.text}")

    rows = res.json()
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

    with httpx.Client(timeout=15) as client:
        res = client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/save_application_ranking",
            headers=_auth_headers(),
            json={
                "p_application_id": application_id,
                "p_score": score,
                "p_semantic_score": semantic_score,
                "p_skill_score": skill_score,
                "p_rationale": rationale,
            },
        )
        if res.status_code != 204 and res.status_code != 200:
            raise RuntimeError(f"save_application_ranking failed ({res.status_code}): {res.text}")


def download_resume(resume_url: str) -> bytes:
    """Resumes live in the public `resumes` Storage bucket, so this is a
    plain GET — no service-role auth needed to read them back."""
    with httpx.Client(timeout=30, follow_redirects=True) as client:
        res = client.get(resume_url)
        if res.status_code != 200:
            raise RuntimeError(f"Resume download failed ({res.status_code}): {res.text}")

    return res.content
