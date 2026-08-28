import os
import uuid

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "ranking-resumes")

SIGNED_URL_TTL_SECONDS = 300


def _require_configured():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError(
            "Resume storage is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        )


def _auth_headers() -> dict:
    return {
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
    }


def ensure_bucket_exists() -> None:
    """Idempotently creates the private resume bucket on startup."""
    _require_configured()

    with httpx.Client(timeout=10) as client:
        res = client.get(f"{SUPABASE_URL}/storage/v1/bucket/{STORAGE_BUCKET}", headers=_auth_headers())
        if res.status_code == 200:
            return

        client.post(
            f"{SUPABASE_URL}/storage/v1/bucket",
            headers=_auth_headers(),
            json={"id": STORAGE_BUCKET, "name": STORAGE_BUCKET, "public": False},
        )


def upload_resume(file_bytes: bytes, filename: str, owner_user_id: str) -> str:
    """Uploads resume bytes to private Supabase Storage; returns the object path."""
    _require_configured()

    safe_ext = os.path.splitext(filename)[1].lower() or ".pdf"
    object_path = f"{owner_user_id}/{uuid.uuid4().hex}{safe_ext}"

    with httpx.Client(timeout=30) as client:
        res = client.post(
            f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{object_path}",
            headers={**_auth_headers(), "Content-Type": "application/pdf"},
            content=file_bytes,
        )
        if res.status_code not in (200, 201):
            raise RuntimeError(f"Resume upload failed ({res.status_code}): {res.text}")

    return object_path


def download_resume(object_path: str) -> bytes:
    """Fetches resume bytes back from private Supabase Storage."""
    _require_configured()

    with httpx.Client(timeout=30) as client:
        res = client.get(
            f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{object_path}",
            headers=_auth_headers(),
        )
        if res.status_code != 200:
            raise RuntimeError(f"Resume download failed ({res.status_code}): {res.text}")

    return res.content


def create_signed_url(object_path: str, expires_in: int = SIGNED_URL_TTL_SECONDS) -> str:
    """Short-lived URL for a human (e.g. a recruiter) to view the original PDF."""
    _require_configured()

    with httpx.Client(timeout=10) as client:
        res = client.post(
            f"{SUPABASE_URL}/storage/v1/object/sign/{STORAGE_BUCKET}/{object_path}",
            headers=_auth_headers(),
            json={"expiresIn": expires_in},
        )
        if res.status_code != 200:
            raise RuntimeError(f"Could not sign resume URL ({res.status_code}): {res.text}")

    signed_path = res.json()["signedURL"]
    return f"{SUPABASE_URL}/storage/v1{signed_path}"
