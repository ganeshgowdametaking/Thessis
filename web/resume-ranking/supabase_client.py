import base64
import binascii
import os
from typing import Optional
from urllib.parse import quote, unquote, urlsplit

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

MAX_RESUME_BYTES = 5 * 1024 * 1024


def _validate_resume_bytes(data: bytes) -> bytes:
    if len(data) > MAX_RESUME_BYTES:
        raise ResumeUnavailableError("Resume exceeds the 5 MB limit.")
    if not data.startswith(b"%PDF-"):
        raise ResumeUnavailableError("Please replace this resume with a PDF file.")
    return data



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


def get_application_for_ranking(application_id: str, caller_id: str) -> Optional[dict]:
    """Fetch only an application the verified caller can rank. The SQL RPC
    enforces ownership or a live referrer assignment."""
    _require_configured()

    with httpx.Client(timeout=15) as client:
        res = client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/get_application_for_ranking",
            headers=_auth_headers(),
            json={"p_application_id": application_id, "p_actor_id": caller_id},
        )
        if res.status_code != 200:
            raise RuntimeError(f"get_application_for_ranking failed ({res.status_code}): {res.text}")

    rows = res.json()
    return rows[0] if rows else None


def save_application_ranking(
    application_id: str,
    caller_id: str,
    score: float,
    semantic_score: float,
    skill_score: float,
    rationale: str,
) -> bool:
    """Persist only if the caller still has access after scoring."""
    _require_configured()

    with httpx.Client(timeout=15) as client:
        res = client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/save_application_ranking",
            headers=_auth_headers(),
            json={
                "p_application_id": application_id,
                "p_actor_id": caller_id,
                "p_score": score,
                "p_semantic_score": semantic_score,
                "p_skill_score": skill_score,
                "p_rationale": rationale,
            },
        )
        if res.status_code != 200:
            raise RuntimeError(f"save_application_ranking failed ({res.status_code}): {res.text}")
        return res.json()


class ResumeUnavailableError(Exception):
    def __init__(self, public_message: str, status_code: int = 422):
        super().__init__(public_message)
        self.public_message = public_message
        self.status_code = status_code


def _resume_object_path(resume_url: str) -> str:
    """Accept new bucket-relative paths and legacy public URLs from our
    Supabase project; reject arbitrary URLs and malformed object paths."""
    source = urlsplit(resume_url)
    if source.scheme or source.netloc:
        project = urlsplit(SUPABASE_URL)
        prefix = f"{project.path.rstrip('/')}/storage/v1/object/public/resumes/"
        if (
            source.scheme != project.scheme
            or source.netloc != project.netloc
            or not source.path.startswith(prefix)
        ):
            raise ResumeUnavailableError("Resume link is invalid — it is not in Thessis storage.")
        path = unquote(source.path[len(prefix):])
    else:
        path = resume_url

    if (
        not path
        or path.startswith("/")
        or "\\" in path
        or "?" in path
        or "#" in path
        or any(part in ("", ".", "..") for part in path.split("/"))
        or any(ord(char) < 32 for char in path)
    ):
        raise ResumeUnavailableError("Resume link is invalid — it is not in Thessis storage.")
    return path


def download_resume(resume_url: str, expected_owner_id: str) -> bytes:
    """Read a private Storage object with service-role auth, after the SQL
    authorization check. Historical PDF data URIs remain readable."""
    if resume_url.startswith("data:application/pdf;base64,"):
        try:
            encoded = resume_url.split(",", 1)[1]
            if len(encoded) > (MAX_RESUME_BYTES + 2) // 3 * 4:
                raise ResumeUnavailableError("Resume exceeds the 5 MB limit.")
            return _validate_resume_bytes(base64.b64decode(encoded, validate=True))
        except binascii.Error as exc:
            raise ResumeUnavailableError("Resume data is invalid.") from exc

    _require_configured()
    path = _resume_object_path(resume_url)
    if path.split("/", 1)[0] != expected_owner_id:
        raise ResumeUnavailableError("Resume link does not belong to this applicant.")
    url = f"{SUPABASE_URL}/storage/v1/object/authenticated/resumes/{quote(path, safe='/')}"
    with httpx.Client(timeout=30, follow_redirects=False) as client:
        with client.stream("GET", url, headers=_auth_headers()) as res:
            if res.status_code != 200:
                raise ResumeUnavailableError(
                    "Resume file could not be found or retrieved.",
                    status_code=502 if res.status_code >= 500 else 422,
                )
            content = bytearray()
            for chunk in res.iter_bytes(chunk_size=65536):
                content.extend(chunk)
                if len(content) > MAX_RESUME_BYTES:
                    raise ResumeUnavailableError("Resume exceeds the 5 MB limit.")
            return _validate_resume_bytes(bytes(content))
