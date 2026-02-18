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

### Evaluation

Use objective ranking metrics before tuning thresholds:

1. Update `evaluation_dataset.json` with:
   - `predicted_order`: ordered candidate names from leaderboard
   - `ground_truth_relevance`: your hiring labels (e.g., 3=strong, 2=good, 1=possible, 0=not fit)
2. Run:
   - `python3 evaluate_ranking.py`
