from sqlalchemy.orm import Session

from database import SessionLocal, engine
import models
import parser
from scoring import score_application

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)


def process_application_task(application_id: int):
    """Parse CV, score against JD, and persist ranking fields for one application."""
    db: Session = SessionLocal()
    try:
        application = db.query(models.Application).filter(models.Application.id == application_id).first()
        if not application:
            return f"Application {application_id} not found"

        job = db.query(models.Job).filter(models.Job.id == application.job_id).first()
        if not job:
            application.status = "FAILED"
            application.processing_error = "Job not found"
            db.commit()
            return "Job not found"

        application.status = "PROCESSING"
        application.processing_error = None
        db.commit()

        parsed = parser.process_resume(application.resume_file_path)
        if not parsed:
            application.status = "FAILED"
            application.processing_error = "Failed to parse PDF content"
            db.commit()
            return "Failed to parse PDF content"

        resume_text = "\n".join(
            [
                parsed["sections"].get("summary", ""),
                parsed["sections"].get("experience", ""),
                parsed["sections"].get("skills", ""),
                parsed["sections"].get("education", ""),
                parsed["sections"].get("projects", ""),
            ]
        ).strip()

        scoring = score_application(
            job_description=job.description,
            job_vector=job.jd_vector,
            resume_text=resume_text,
            profile_text=application.profile_text,
            resume_sections=parsed.get("sections") if isinstance(parsed, dict) else None,
        )

        application.resume_text = resume_text
        application.embedding = scoring["embedding"]
        application.score = scoring["score"]
        application.semantic_score = scoring["semantic_score"]
        application.keyword_score = scoring["keyword_score"]
        application.heuristic_score = scoring["heuristic_score"]
        application.rationale = scoring["rationale"]
        application.status = "RANKED"

        db.commit()
        return f"Application {application.id} ranked with score {application.score}"

    except Exception as exc:
        db.rollback()
        app = db.query(models.Application).filter(models.Application.id == application_id).first()
        if app:
            app.status = "FAILED"
            app.processing_error = str(exc)
            db.commit()
        return f"Failed: {exc}"
    finally:
        db.close()
