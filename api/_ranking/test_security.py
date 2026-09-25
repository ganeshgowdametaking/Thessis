"""Focused checks for the service-role ranking clients.

Run with: python3 -m unittest api/_ranking/test_security.py
"""

import importlib.util
from pathlib import Path
import unittest
from unittest import mock


ROOT = Path(__file__).resolve().parents[2]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


vercel = load_module("vercel_ranking_supabase_client", ROOT / "api/_ranking/supabase_client.py")
fastapi = load_module("fastapi_ranking_supabase_client", ROOT / "web/resume-ranking/supabase_client.py")
vercel_endpoint = load_module("vercel_ranking_endpoint", ROOT / "api/rank-application.py")


class RankingClientSecurityTests(unittest.TestCase):
    def test_unauthorized_vercel_request_never_downloads_or_scores(self):
        request = object.__new__(vercel_endpoint.handler)
        request.path = "/api/rank-application?applicationId=app-1"
        request.headers = {"Authorization": "Bearer valid-token"}
        responses = []
        request._send_json = lambda status, payload: responses.append((status, payload))

        with (
            mock.patch.object(vercel_endpoint, "get_current_user_id", return_value="other-user"),
            mock.patch.object(
                vercel_endpoint.supabase_client,
                "get_application_for_ranking",
                return_value=None,
            ) as read,
            mock.patch.object(vercel_endpoint.supabase_client, "download_resume") as download,
            mock.patch.object(vercel_endpoint.supabase_client, "save_application_ranking") as save,
        ):
            request.do_POST()

        read.assert_called_once_with("app-1", "other-user")
        download.assert_not_called()
        save.assert_not_called()
        self.assertEqual(responses[0][0], 404)

    def test_vercel_rejects_assignment_revoked_before_save(self):
        request = object.__new__(vercel_endpoint.handler)
        request.path = "/api/rank-application?applicationId=app-1"
        request.headers = {"Authorization": "Bearer valid-token"}
        responses = []
        request._send_json = lambda status, payload: responses.append((status, payload))
        record = {
            "applicant_id": "candidate",
            "resume_url": "candidate/file.pdf",
            "job_description": "job description",
        }
        scoring = {
            "score": 72,
            "semantic_score": 70,
            "keyword_score": 75,
            "rationale": "Match",
        }

        with (
            mock.patch.object(vercel_endpoint, "get_current_user_id", return_value="referrer"),
            mock.patch.object(vercel_endpoint.supabase_client, "get_application_for_ranking", return_value=record),
            mock.patch.object(vercel_endpoint.supabase_client, "download_resume", return_value=b"%PDF-test") as download,
            mock.patch.object(vercel_endpoint.parser, "process_resume", return_value={"sections": {}}),
            mock.patch.object(vercel_endpoint.ranker, "encode_text", return_value=[]),
            mock.patch.object(vercel_endpoint, "score_application", return_value=scoring),
            mock.patch.object(vercel_endpoint.supabase_client, "save_application_ranking", return_value=False) as save,
        ):
            request.do_POST()

        download.assert_called_once_with("candidate/file.pdf", "candidate")
        self.assertEqual(save.call_args.kwargs["caller_id"], "referrer")
        self.assertEqual(responses[0][0], 403)

    def test_vercel_rpc_passes_verified_caller_and_rechecks_on_save(self):
        with (
            mock.patch.object(vercel, "SUPABASE_URL", "https://example.supabase.co"),
            mock.patch.object(vercel, "SUPABASE_SERVICE_ROLE_KEY", "service-secret"),
            mock.patch.object(
                vercel,
                "_post_json",
                side_effect=[
                    (200, b'[{"application_id":"app-1"}]'),
                    (200, b"false"),
                ],
            ) as post,
        ):
            self.assertEqual(
                vercel.get_application_for_ranking("app-1", "job-owner"),
                {"application_id": "app-1"},
            )
            self.assertFalse(
                vercel.save_application_ranking("app-1", "job-owner", 72, 70, 75, "Match")
            )

        read_body = post.call_args_list[0].args[1]
        save_body = post.call_args_list[1].args[1]
        self.assertEqual(read_body, {"p_application_id": "app-1", "p_actor_id": "job-owner"})
        self.assertEqual(save_body["p_actor_id"], "job-owner")

    def test_private_download_uses_service_role_and_stays_in_applicant_folder(self):
        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b"%PDF-test"

        class Opener:
            request = None

            def open(self, request, timeout):
                self.request = request
                return Response()

        opener = Opener()
        with (
            mock.patch.object(vercel, "SUPABASE_URL", "https://example.supabase.co"),
            mock.patch.object(vercel, "SUPABASE_SERVICE_ROLE_KEY", "service-secret"),
            mock.patch.object(vercel.urllib.request, "build_opener", return_value=opener),
        ):
            self.assertEqual(
                vercel.download_resume("candidate/resume 1.pdf", "candidate"), b"%PDF-test"
            )
            self.assertEqual(
                opener.request.full_url,
                "https://example.supabase.co/storage/v1/object/authenticated/resumes/candidate/resume%201.pdf",
            )
            self.assertEqual(opener.request.get_header("Authorization"), "Bearer service-secret")

            old_public_url = (
                "https://example.supabase.co/storage/v1/object/public/resumes/"
                "candidate/resume%201.pdf"
            )
            self.assertEqual(vercel.download_resume(old_public_url, "candidate"), b"%PDF-test")
            self.assertEqual(
                opener.request.full_url,
                "https://example.supabase.co/storage/v1/object/authenticated/resumes/candidate/resume%201.pdf",
            )

            for bad_source in (
                "https://evil.example/resume.pdf",
                "https://example.supabase.co.evil.example/storage/v1/object/public/resumes/candidate/resume.pdf",
                "other-user/resume.pdf",
                "candidate/../other-user/resume.pdf",
                "https://example.supabase.co/storage/v1/object/public/avatars/candidate/resume.pdf",
            ):
                with self.subTest(bad_source=bad_source):
                    with self.assertRaises(vercel.ResumeUnavailableError):
                        vercel.download_resume(bad_source, "candidate")

    def test_fastapi_rpc_passes_caller_and_private_download_uses_auth(self):
        calls = []

        class Response:
            status_code = 200
            text = ""
            content = b"%PDF-test"

            def __init__(self, payload=None):
                self.payload = payload

            def json(self):
                return self.payload

        class Client:
            def __init__(self, *args, **kwargs):
                self.kwargs = kwargs

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def post(self, url, headers, json):
                calls.append((url, headers, json))
                return Response([{"application_id": "app-1"}] if url.endswith("get_application_for_ranking") else True)

            def get(self, url, headers):
                calls.append((url, headers, None))
                return Response()

        with (
            mock.patch.object(fastapi, "SUPABASE_URL", "https://example.supabase.co"),
            mock.patch.object(fastapi, "SUPABASE_SERVICE_ROLE_KEY", "service-secret"),
            mock.patch.object(fastapi.httpx, "Client", Client),
        ):
            self.assertEqual(
                fastapi.get_application_for_ranking("app-1", "job-owner"),
                {"application_id": "app-1"},
            )
            self.assertTrue(
                fastapi.save_application_ranking("app-1", "job-owner", 72, 70, 75, "Match")
            )
            self.assertEqual(
                fastapi.download_resume("candidate/file.pdf", "candidate"), b"%PDF-test"
            )
            with self.assertRaises(fastapi.ResumeUnavailableError):
                fastapi.download_resume("other-user/file.pdf", "candidate")

        self.assertEqual(calls[0][2]["p_actor_id"], "job-owner")
        self.assertEqual(calls[1][2]["p_actor_id"], "job-owner")
        self.assertEqual(
            calls[2][0],
            "https://example.supabase.co/storage/v1/object/authenticated/resumes/candidate/file.pdf",
        )
        self.assertEqual(calls[2][1]["Authorization"], "Bearer service-secret")


if __name__ == "__main__":
    unittest.main()
