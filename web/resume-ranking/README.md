## Resume Ranking Backend

This folder contains the FastAPI backend used by the Applications page AI ranking flow.

### Local setup

1. Create a virtual environment and install dependencies:
   - `cd web/resume-ranking`
   - `python3 -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -r requirements.txt`
2. Run the ranking API:
   - `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

### TankTide integration

- Frontend calls `/api/ranking/*` by default.
- Vite proxies `/api/*` to `web/server.cjs`.
- `web/server.cjs` forwards ranking requests to `RANKING_API_URL` (default `http://127.0.0.1:8000`).
- API responses now expose public UUID identifiers (`id`) and legacy numeric IDs (`legacy_id`) for backward compatibility.

### Security baseline

- Use managed Postgres in production (`DATABASE_URL`) with SSL enforced.
- Do not use SQLite in production (`APP_ENV=production` blocks startup with SQLite).
- Configure CORS explicitly using:
  - `CORS_ALLOW_ORIGINS`
  - `CORS_ALLOW_ORIGIN_REGEX`
- Configure SIEM forwarding:
  - `SECURITY_LOG_WEBHOOK_URL`
- Configure upload ceiling:
  - `MAX_RESUME_UPLOAD_MB` (default 10MB)

### Evaluation

Use objective ranking metrics before tuning thresholds:

1. Update `evaluation_dataset.json` with:
   - `predicted_order`: ordered candidate names from leaderboard
   - `ground_truth_relevance`: your hiring labels (e.g., 3=strong, 2=good, 1=possible, 0=not fit)
2. Run:
   - `python3 evaluate_ranking.py`
