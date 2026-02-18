import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default is local SQLite so setup works with zero infrastructure.
# You can still override with Postgres using DATABASE_URL.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resume_ranking.db")
APP_ENV = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).lower()

if APP_ENV in {"prod", "production"} and DATABASE_URL.startswith("sqlite"):
    raise RuntimeError("Production environment must not use SQLite. Set DATABASE_URL to managed Postgres.")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
if APP_ENV in {"prod", "production"} and DATABASE_URL.startswith(("postgresql://", "postgres://")):
    connect_args = {**connect_args, "sslmode": "require"}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
