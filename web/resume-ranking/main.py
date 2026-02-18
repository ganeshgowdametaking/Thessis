import os
import shutil
import uuid
from typing import Optional

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, get_db
import models
import ranker
from tasks import process_application_task

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Ranking API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serialize_application(application: models.Application):
    shortlisted, shortlist_reason = _shortlist_decision(application)
    return {
        "id": application.id,
        "job_id": application.job_id,
        "name": application.name,
        "email": application.email,
        "phone": application.phone,
        "status": application.status,
        "score": application.score,
        "semantic_score": application.semantic_score,
        "keyword_score": application.keyword_score,
        "heuristic_score": application.heuristic_score,
        "rationale": application.rationale,
        "processing_error": application.processing_error,
        "shortlisted": shortlisted,
        "shortlist_reason": shortlist_reason,
        "created_at": application.created_at.isoformat() if application.created_at else None,
        "updated_at": application.updated_at.isoformat() if application.updated_at else None,
    }


def _shortlist_decision(application: models.Application):
    if application.status != "RANKED":
        return False, "Application is not ranked yet."

    score = application.score or 0.0
    semantic = application.semantic_score or 0.0
    skill_fit = application.keyword_score or 0.0

    reasons = []
    if score < 50:
        reasons.append(f"final score {score:.2f}% is below shortlist threshold (50%).")
    if skill_fit < 50:
        reasons.append(f"required-skill fit {skill_fit:.2f}% is below threshold (50%).")
    if semantic < 55:
        reasons.append(f"semantic match {semantic:.2f}% is below threshold (55%).")

    if reasons:
        return False, " ".join(reasons)
    return True, "Meets shortlist criteria."


@app.get("/health")
def healthcheck():
    return {"ok": True, "engine": "background-tasks", "db": str(engine.url)}


@app.post("/jobs/")
def create_job(title: str = Form(...), description: str = Form(...), db: Session = Depends(get_db)):
    try:
        vector = ranker.encode_text(description)
        job = models.Job(title=title, description=description, jd_vector=vector)
        db.add(job)
        db.commit()
        db.refresh(job)

        return {
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "message": "Job created successfully",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
    }


@app.post("/jobs/{job_id}/applications/")
async def submit_application(
    job_id: int,
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(default=None),
    profile_text: Optional[str] = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported")

    upload_dir = "uploaded_resumes"
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = file.filename.replace(" ", "_")
    stored_filename = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(upload_dir, stored_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    application = models.Application(
        job_id=job_id,
        name=name,
        email=email,
        phone=phone,
        profile_text=profile_text,
        resume_file_path=os.path.abspath(file_path),
        status="RECEIVED",
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    background_tasks.add_task(process_application_task, application.id)

    return {
        "application_id": application.id,
        "status": application.status,
        "message": "Application submitted and queued for ranking",
    }


@app.get("/applications/{application_id}")
def get_application(application_id: int, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return _serialize_application(application)


@app.get("/jobs/{job_id}/applications")
def list_applications(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    rows = (
        db.query(models.Application)
        .filter(models.Application.job_id == job_id)
        .order_by(models.Application.score.desc().nullslast(), models.Application.created_at.asc())
        .all()
    )

    return [_serialize_application(row) for row in rows]


@app.get("/jobs/{job_id}/leaderboard")
def get_leaderboard(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    ranked = (
        db.query(models.Application)
        .filter(models.Application.job_id == job_id, models.Application.status == "RANKED")
        .order_by(models.Application.score.desc(), models.Application.created_at.asc())
        .all()
    )

    pending_count = (
        db.query(models.Application)
        .filter(models.Application.job_id == job_id, models.Application.status.in_(["RECEIVED", "PROCESSING"]))
        .count()
    )

    failed_count = (
        db.query(models.Application)
        .filter(models.Application.job_id == job_id, models.Application.status == "FAILED")
        .count()
    )

    serialized_ranked = [_serialize_application(row) for row in ranked]

    def rerank_key(candidate):
        # Balance overall score with semantic + required-skill fit.
        final_s = float(candidate.get("score") or 0.0)
        semantic = float(candidate.get("semantic_score") or 0.0)
        skill = float(candidate.get("keyword_score") or 0.0)
        balanced = (final_s * 0.65) + (semantic * 0.20) + (skill * 0.15)
        return balanced

    serialized_ranked.sort(key=rerank_key, reverse=True)
    shortlisted = [row for row in serialized_ranked if row["shortlisted"]]
    non_shortlisted = [row for row in serialized_ranked if not row["shortlisted"]]

    return {
        "job": {"id": job.id, "title": job.title},
        "top_5": shortlisted[:5],
        "others": shortlisted[5:] + non_shortlisted,
        "total_ranked": len(serialized_ranked),
        "shortlisted_count": len(shortlisted),
        "pending_count": pending_count,
        "failed_count": failed_count,
    }


# Legacy endpoint retained for old frontend contract.
@app.get("/results/{job_id}")
def get_results(job_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Application)
        .filter(models.Application.job_id == job_id, models.Application.status == "RANKED")
        .order_by(models.Application.score.desc())
        .all()
    )

    return [
        {
            "id": row.name,
            "final_score": row.score,
            "breakdown": {
                "semantic": row.semantic_score,
                "keyword": row.keyword_score,
                "heuristic": row.heuristic_score,
            },
            "rationale": row.rationale,
        }
        for row in rows
    ]
