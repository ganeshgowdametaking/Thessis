## Resume Ranking Backend

FastAPI service used by the Applications page's "AI Resume Ranking" panel.
Deterministic, non-LLM scoring only (regex/keyword extraction against
`skills_taxonomy.json` + a weighted formula in `scoring.py`) — no generative
AI calls, so it can't hallucinate a skill that isn't in the resume.

It has no database of its own. It reads/writes the real Thessis Supabase
`applications`/`jobs`/`profiles` tables directly via two service-role-only
Postgres RPCs (`get_application_for_ranking`, `save_application_ranking` —
see `supabase/migrations/20260910090000_applicant_ranking_columns_and_rpcs.sql`).

### Local setup

1. Create a virtual environment and install dependencies:
   - `cd web/resume-ranking`
   - `python3 -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -r requirements.txt`
2. Set env vars (see below) and run:
   - `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

### Required env vars

- `SUPABASE_URL` — same value as the main app's `VITE_SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase project's service role key (Settings → API). Never expose this to the frontend.
- `SUPABASE_JWT_SECRET` — Settings → API → JWT Secret. Used to verify the referrer's session token on every request.
- `SUPABASE_JWT_AUDIENCE` — optional, defaults to `authenticated`.

### API

One endpoint: `POST /applications/{application_id}/rank`, `Authorization: Bearer <supabase session JWT>` required.
Synchronously downloads the applicant's resume from the public `resumes` Storage bucket, scores it against the
job description, writes `ai_score`/`ai_semantic_score`/`ai_skill_score`/`ai_rationale`/`ai_ranked_at` onto that
`applications` row, and returns the same result in the response. No job-creation step, no leaderboard polling —
each application is scored independently and the result is read back by re-querying `applications` as usual.

### Thessis integration

- Frontend (`ApplicationsPage.tsx`) calls `VITE_RESUME_RANKING_API` (default `/api/ranking`) per applicant.
- Vite proxies `/api/*` to `web/server.cjs` in local dev.
- `web/server.cjs`'s `/ranking/applications/:applicationId/rank` route forwards to `RANKING_API_URL`
  (default `http://127.0.0.1:8000`), passing the caller's `Authorization` header through unchanged.
- In production this service is meant to run on a free scale-to-zero host (e.g. Cloud Run — the `Dockerfile`
  here builds directly for it and respects the `PORT` env var it injects); point `RANKING_API_URL`
  (or `VITE_RESUME_RANKING_API`, if calling it directly without going through `server.cjs`) at that deployed URL.

### Security baseline

- Every request requires a valid Supabase session JWT (`auth.py` + `Depends(get_current_user_id)` in `main.py`).
- Configure CORS explicitly using:
  - `CORS_ALLOW_ORIGINS`
  - `CORS_ALLOW_ORIGIN_REGEX`
- Configure SIEM forwarding:
  - `SECURITY_LOG_WEBHOOK_URL`

### Widening skill/role matching

Add terms to `skills_taxonomy.json`, not `scoring.py` — it's loaded at import time and is the intended single
place to extend matching (see that file's own `_comment`).

### Evaluation

Use objective ranking metrics before tuning thresholds:

1. Update `evaluation_dataset.json` with:
   - `predicted_order`: ordered candidate names
   - `ground_truth_relevance`: your hiring labels (e.g., 3=strong, 2=good, 1=possible, 0=not fit)
2. Run:
   - `python3 evaluate_ranking.py`
