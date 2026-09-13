"""Vercel Python serverless function — scores one real Thessis application
against its job description using the deterministic, non-LLM engine in
./_ranking (ported from web/resume-ranking/, which stays untouched — this is
a self-contained alternative that needs no separate cloud service/billing).

Route: POST /api/rank-application?applicationId=<uuid>
Header: Authorization: Bearer <supabase session JWT>

Synchronous, same as the Cloud-Run version: this is regex/keyword scoring,
not an LLM call, so there's nothing worth backgrounding, and a serverless
function's lifetime is the request/response cycle anyway.
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "_ranking"))

import parser  # noqa: E402
import ranker  # noqa: E402
import supabase_client  # noqa: E402
from auth import AuthError, get_current_user_id  # noqa: E402
from scoring import score_application  # noqa: E402

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.end_headers()

    def do_POST(self):
        query = parse_qs(urlparse(self.path).query)
        application_id = (query.get("applicationId") or [None])[0]
        if not application_id:
            self._send_json(400, {"error": "Missing applicationId query parameter"})
            return

        try:
            get_current_user_id(self.headers.get("Authorization", ""))
        except AuthError as exc:
            self._send_json(exc.status_code, {"error": exc.message})
            return

        try:
            record = supabase_client.get_application_for_ranking(application_id)
        except Exception as exc:
            self._send_json(502, {"error": f"Could not reach Supabase: {exc}"})
            return

        if not record:
            self._send_json(404, {"error": "Application not found"})
            return

        if not record.get("resume_url"):
            self._send_json(422, {"error": "Applicant has no resume on file"})
            return

        try:
            resume_bytes = supabase_client.download_resume(record["resume_url"])
        except supabase_client.ResumeUnavailableError as exc:
            self._send_json(exc.status_code, {"error": exc.public_message})
            return
        except Exception as exc:
            print(f"[rank_application_unexpected_download_error] {exc}")
            self._send_json(502, {"error": "Resume file could not be retrieved due to an unexpected error."})
            return

        parsed = parser.process_resume(resume_bytes)
        if not parsed:
            self._send_json(422, {"error": "Failed to parse resume PDF"})
            return

        resume_text = "\n".join(
            [
                parsed["sections"].get("summary", ""),
                parsed["sections"].get("experience", ""),
                parsed["sections"].get("skills", ""),
                parsed["sections"].get("education", ""),
                parsed["sections"].get("projects", ""),
            ]
        ).strip()

        job_vector = ranker.encode_text(record.get("job_description") or "")

        scoring = score_application(
            job_description=record.get("job_description") or "",
            job_vector=job_vector,
            resume_text=resume_text,
            profile_text=record.get("profile_text"),
            resume_sections=parsed.get("sections"),
        )

        try:
            supabase_client.save_application_ranking(
                application_id=application_id,
                score=scoring["score"],
                semantic_score=scoring["semantic_score"],
                skill_score=scoring["keyword_score"],
                rationale=scoring["rationale"],
            )
        except Exception as exc:
            self._send_json(502, {"error": f"Scored, but could not save result: {exc}"})
            return

        self._send_json(
            200,
            {
                "application_id": application_id,
                "score": scoring["score"],
                "semantic_score": scoring["semantic_score"],
                "skill_score": scoring["keyword_score"],
                "rationale": scoring["rationale"],
            },
        )
