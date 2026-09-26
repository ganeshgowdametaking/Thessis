import base64
import binascii
import json
import os
import urllib.error
import urllib.request
from typing import Optional
from urllib.parse import quote, unquote, urlsplit

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


def get_application_for_ranking(application_id: str, caller_id: str) -> Optional[dict]:
    """Read ranking inputs only when the verified caller owns the job or is
    its currently assigned referrer. The service-role RPC enforces this."""
    _require_configured()

    status, body = _post_json(
        f"{SUPABASE_URL}/rest/v1/rpc/get_application_for_ranking",
        {"p_application_id": application_id, "p_actor_id": caller_id},
    )
    if status != 200:
        raise RuntimeError(f"get_application_for_ranking failed ({status}): {body.decode(errors='replace')}")

    rows = json.loads(body)
    return rows[0] if rows else None


def save_application_ranking(
    application_id: str,
    caller_id: str,
    score: float,
    semantic_score: float,
    skill_score: float,
    rationale: str,
) -> bool:
    """Persist a score only if the caller still has access. A referral may
    be reassigned while the resume is being parsed and scored."""
    _require_configured()

    status, body = _post_json(
        f"{SUPABASE_URL}/rest/v1/rpc/save_application_ranking",
        {
            "p_application_id": application_id,
            "p_actor_id": caller_id,
            "p_score": score,
            "p_semantic_score": semantic_score,
            "p_skill_score": skill_score,
            "p_rationale": rationale,
        },
    )
    if status != 200:
        raise RuntimeError(f"save_application_ranking failed ({status}): {body.decode(errors='replace')}")
    return json.loads(body)


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


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Do not forward the service-role Authorization header to a redirect."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _resume_object_path(resume_url: str) -> str:
    """Accept new bucket-relative paths and old public URLs from this exact
    Supabase project. Never fetch an arbitrary URL supplied by an applicant."""
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
    """Download a private resume with service-role auth after the caller's
    permission has been checked by get_application_for_ranking()."""
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
    req = urllib.request.Request(url, headers=_auth_headers(), method="GET")
    try:
        with urllib.request.build_opener(_NoRedirect()).open(req, timeout=30) as res:
            return _validate_resume_bytes(res.read(MAX_RESUME_BYTES + 1))
    except ResumeUnavailableError:
        raise
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
