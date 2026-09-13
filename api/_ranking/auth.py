import os

from jose import JWTError, jwt

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")


class AuthError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def get_current_user_id(authorization_header: str) -> str:
    """Verifies the Supabase-issued access token on every request.

    Plain-function version of the FastAPI Depends() used by the Cloud-Run
    variant of this service (web/resume-ranking/auth.py) — same checks,
    just taking the raw Authorization header value directly instead of via
    a framework dependency, since this runs as a bare Vercel Python function.

    Returns the caller's Supabase auth user id (the JWT `sub` claim), which
    matches `profiles.id` / `jobs.created_by` in the main Thessis database.
    """
    if not SUPABASE_JWT_SECRET:
        raise AuthError(500, "Server misconfigured: SUPABASE_JWT_SECRET is not set")

    if not authorization_header or not authorization_header.lower().startswith("bearer "):
        raise AuthError(401, "Missing or malformed Authorization header")

    token = authorization_header.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=JWT_AUDIENCE,
        )
    except JWTError:
        raise AuthError(401, "Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise AuthError(401, "Token missing subject claim")

    return user_id
