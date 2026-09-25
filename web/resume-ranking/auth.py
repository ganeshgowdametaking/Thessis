import os

from fastapi import Header, HTTPException
import jwt
from jwt.exceptions import InvalidTokenError

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")


async def get_current_user_id(authorization: str = Header(default="")) -> str:
    """Verifies the Supabase-issued access token on every request.

    Returns the caller's Supabase auth user id (the JWT `sub` claim), which
    matches `profiles.id` / `jobs.created_by` in the main Thessis database.
    """
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="Server misconfigured: SUPABASE_JWT_SECRET is not set")

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.split(" ", 1)[1].strip()

    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=JWT_AUDIENCE,
        )
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject claim")

    return user_id
