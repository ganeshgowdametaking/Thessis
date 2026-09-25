"""JWT checks shared by the Vercel and FastAPI ranking services.

Run with: python3 -m unittest api/_ranking/test_auth.py
"""

import asyncio
import importlib.util
from pathlib import Path
import sys
import time
import types
import unittest
from unittest import mock

import jwt


ROOT = Path(__file__).resolve().parents[2]
SECRET = "test-only-jwt-secret"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


vercel = load_module("vercel_ranking_auth", ROOT / "api/_ranking/auth.py")


class TestHTTPException(Exception):
    def __init__(self, status_code, detail):
        super().__init__(detail)
        self.status_code = status_code


# The FastAPI auth module only needs these two names. Keep the JWT test
# independent of the host machine's full FastAPI/Pydantic installation.
fastapi_stub = types.ModuleType("fastapi")
fastapi_stub.Header = lambda default="": default
fastapi_stub.HTTPException = TestHTTPException
with mock.patch.dict(sys.modules, {"fastapi": fastapi_stub}):
    fastapi = load_module("fastapi_ranking_auth", ROOT / "web/resume-ranking/auth.py")


class RankingAuthTests(unittest.TestCase):
    def _authenticate(self, module, token):
        with mock.patch.object(module, "SUPABASE_JWT_SECRET", SECRET):
            if module is fastapi:
                return asyncio.run(module.get_current_user_id(authorization=f"Bearer {token}"))
            return module.get_current_user_id(f"Bearer {token}")

    def _assert_rejected(self, module, token, expected_status=401):
        error_class = fastapi.HTTPException if module is fastapi else vercel.AuthError
        with self.assertRaises(error_class) as raised:
            self._authenticate(module, token)
        self.assertEqual(raised.exception.status_code, expected_status)

    def test_valid_supabase_hs256_token(self):
        token = jwt.encode(
            {"sub": "caller-123", "aud": "authenticated", "exp": int(time.time()) + 60},
            SECRET,
            algorithm="HS256",
        )
        for module in (vercel, fastapi):
            with self.subTest(module=module.__name__):
                self.assertEqual(self._authenticate(module, token), "caller-123")

    def test_rejects_bad_signature_wrong_audience_and_expired_token(self):
        cases = (
            jwt.encode(
                {"sub": "caller-123", "aud": "authenticated", "exp": int(time.time()) + 60},
                "wrong-secret",
                algorithm="HS256",
            ),
            jwt.encode(
                {"sub": "caller-123", "aud": "other", "exp": int(time.time()) + 60},
                SECRET,
                algorithm="HS256",
            ),
            jwt.encode(
                {"sub": "caller-123", "aud": "authenticated", "exp": int(time.time()) - 60},
                SECRET,
                algorithm="HS256",
            ),
        )
        for module in (vercel, fastapi):
            for token in cases:
                with self.subTest(module=module.__name__, token=token[:12]):
                    self._assert_rejected(module, token)

    def test_rejects_missing_subject(self):
        token = jwt.encode(
            {"aud": "authenticated", "exp": int(time.time()) + 60},
            SECRET,
            algorithm="HS256",
        )
        for module in (vercel, fastapi):
            with self.subTest(module=module.__name__):
                self._assert_rejected(module, token)


if __name__ == "__main__":
    unittest.main()
