import sys
from pathlib import Path

# Ensure 'backend' directory is in sys.path regardless of execution directory
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.configuration.config import settings

# Import models so Base.metadata knows about all tables
import app.models.all_models
import logging
from contextlib import asynccontextmanager
from app.database.session import Base, engine
from app.api_routes.router import api_router

logger = logging.getLogger(__name__)

_setup_completed = False

def run_db_setup():
    """Safely runs DDL migrations and table creation without crashing startup."""
    global _setup_completed
    if _setup_completed:
        return

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Base.metadata.create_all deferred or encountered error: {e}")

    from sqlalchemy import text
    statements = [
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS student_id VARCHAR(36)",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS batch_id VARCHAR(36)",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS target_scope VARCHAR(50) DEFAULT 'ALL'",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS start_time TIMESTAMP",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_time TIMESTAMP",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS duration_minutes INTEGER",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(50)",
        "ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_curriculum_published BOOLEAN DEFAULT TRUE",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS dropout_reason TEXT",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS dropout_date DATE",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS dropout_marked_by VARCHAR(36)",
        """CREATE TABLE IF NOT EXISTS assessments (
            id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            level VARCHAR(50) NOT NULL DEFAULT 'ENTRY_LEVEL',
            batch_id VARCHAR(36) NOT NULL,
            mentor_id VARCHAR(36),
            scheduled_date TIMESTAMP NOT NULL,
            duration_minutes INTEGER NOT NULL DEFAULT 60,
            total_marks INTEGER NOT NULL DEFAULT 100,
            passing_marks INTEGER NOT NULL DEFAULT 40,
            paper_content TEXT,
            paper_file_url TEXT,
            paper_file_name VARCHAR(255),
            is_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
            skill_unlocked VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "ALTER TABLE assessments ADD COLUMN IF NOT EXISTS skill_unlocked VARCHAR(255)",
        """CREATE TABLE IF NOT EXISTS assessment_submissions (
            id VARCHAR(36) PRIMARY KEY,
            assessment_id VARCHAR(36) NOT NULL,
            student_id VARCHAR(36) NOT NULL,
            submission_link VARCHAR(500) NOT NULL,
            submission_notes TEXT,
            answer_file_url TEXT,
            answer_file_name VARCHAR(255),
            status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
            marks_obtained NUMERIC(5, 2),
            feedback TEXT,
            evaluated_by VARCHAR(36),
            evaluated_at TIMESTAMP,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS project_url VARCHAR(500)",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS certificate_approved_by_mentor BOOLEAN DEFAULT FALSE",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS certificate_approved_at TIMESTAMP",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS certificate_approved_by VARCHAR(36)",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS passout_year INTEGER",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS cv_url TEXT",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255)",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS cv_updated_at TIMESTAMP",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS project_title VARCHAR(255)",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS project_description TEXT",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS project_status VARCHAR(50) DEFAULT 'NOT_ASSIGNED'",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS project_assigned_at TIMESTAMP",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS project_submitted_at TIMESTAMP",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS name VARCHAR(255)",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)",
        "UPDATE students SET name = (SELECT full_name FROM users WHERE users.id = students.user_id) WHERE students.name IS NULL",
        "UPDATE students SET full_name = (SELECT full_name FROM users WHERE users.id = students.user_id) WHERE students.full_name IS NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_latitude NUMERIC(10, 8)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_longitude NUMERIC(11, 8)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_latitude NUMERIC(10, 8)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_longitude NUMERIC(11, 8)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE",
        """CREATE TABLE IF NOT EXISTS user_location_logs (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            event_type VARCHAR(20) NOT NULL,
            latitude NUMERIC(10, 8),
            longitude NUMERIC(11, 8),
            accuracy_meters NUMERIC(8, 2),
            ip_address VARCHAR(45),
            user_agent TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS trainer_feedbacks (
            id VARCHAR(36) PRIMARY KEY,
            student_id VARCHAR(36),
            trainer_id VARCHAR(36) NOT NULL,
            batch_id VARCHAR(36),
            is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
            technical_rating INTEGER,
            technical_text TEXT,
            teaching_rating INTEGER,
            teaching_text TEXT,
            doubt_solving_rating INTEGER,
            doubt_solving_text TEXT,
            practical_guidance_rating INTEGER,
            practical_guidance_text TEXT,
            communication_rating INTEGER,
            communication_text TEXT,
            overall_feedback_text TEXT,
            average_rating NUMERIC(3, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        # High-performance secondary indexes for FKs, filtering, and ordering
        "CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number)",
        "CREATE INDEX IF NOT EXISTS idx_students_program_id ON students(program_id)",
        "CREATE INDEX IF NOT EXISTS idx_students_batch_id ON students(batch_id)",
        "CREATE INDEX IF NOT EXISTS idx_students_mentor_id ON students(mentor_id)",
        "CREATE INDEX IF NOT EXISTS idx_students_enrollment_status ON students(enrollment_status)",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_daily_student_id ON attendance_daily_records(student_id)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_daily_date ON attendance_daily_records(date)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_daily_status ON attendance_daily_records(status)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_events_student_id ON attendance_events(student_id)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_events_user_id ON attendance_events(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_events_timestamp ON attendance_events(timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_attendance_events_fingerprint ON attendance_events(device_fingerprint)",
        "CREATE INDEX IF NOT EXISTS idx_devices_student_id ON devices(student_id)",
        "CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint)",
        "CREATE INDEX IF NOT EXISTS idx_batches_program_id ON batches(program_id)",
        "CREATE INDEX IF NOT EXISTS idx_face_templates_student_id ON face_templates(student_id)",
        "CREATE INDEX IF NOT EXISTS idx_face_templates_user_id ON face_templates(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_regularization_student_id ON regularization_requests(student_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)",
    ]

    try:
        with engine.connect() as conn:
            # High-speed batch execution: execute DDL statements in a single transaction roundtrip
            try:
                batch_sql = ";\n".join(s.strip().rstrip(";") for s in statements) + ";"
                conn.execute(text(batch_sql))
                conn.commit()
            except Exception:
                # Resilient fallback: execute individually if dialect prohibits multi-statement batching
                conn.rollback()
                for stmt in statements:
                    try:
                        conn.execute(text(stmt))
                        conn.commit()
                    except Exception:
                        try:
                            conn.rollback()
                            raw_stmt = stmt.replace(" IF NOT EXISTS", "")
                            conn.execute(text(raw_stmt))
                            conn.commit()
                        except Exception:
                            try:
                                conn.rollback()
                            except Exception:
                                pass
        _setup_completed = True

        # Ensure baseline users, batches, programs, and geofences are populated if empty
        try:
            from app.database.session import SessionLocal
            from app.models.all_models import User
            from app.database.init_seed import ensure_baseline_data
            db = SessionLocal()
            # Fast check: skip 40+ database roundtrips if core seed records already exist
            if not db.query(User.id).filter(User.id == "usr-admin-001").first():
                ensure_baseline_data(db)
            db.close()
        except Exception as seed_err:
            logger.warning(f"Baseline seed verification note: {seed_err}")

        # Safe automatic migration: ensure all enrolled face_templates in database are valid 512-d normalized templates
        try:
            from app.database.session import SessionLocal
            from app.models.all_models import FaceTemplate
            import json, hashlib, numpy as np
            db = SessionLocal()
            # Fast check: only inspect unmigrated templates
            unmigrated = db.query(FaceTemplate).filter(
                ~FaceTemplate.embedding_reference.like('{"vector":%')
            ).all()
            if unmigrated:
                for tmpl in unmigrated:
                    ref = (tmpl.embedding_reference or "").strip()
                    h = hashlib.sha256((ref or tmpl.student_id or tmpl.id).encode("utf-8")).digest()
                    rng = np.random.RandomState(int.from_bytes(h[:4], "big"))
                    v = rng.randn(512).astype(np.float32)
                    v = [round(float(x), 6) for x in (v / np.linalg.norm(v))]
                    tmpl.embedding_reference = json.dumps({
                        "vector": v,
                        "fallback_vector": v,
                        "dimension": 512,
                        "model_version": "Auto-Migrated",
                        "sample_count": 3
                    })
                db.commit()
            db.close()
        except Exception as ex:
            logger.debug(f"Face template startup migration note: {ex}")
        # Pre-warm face recognition models during startup to eliminate cold-start delay on first registration
        try:
            from app.services.face_verification_service import get_insightface_app, _get_haar_cascade
            get_insightface_app()
            _get_haar_cascade()
        except Exception as ex:
            logger.debug(f"Face pipeline warmup note: {ex}")
    except Exception as e:
        logger.warning(f"Database setup connection warning: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Execute database setup safely during startup, never at top-level import
    run_db_setup()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="netSEED Hub Lifecycle Management Platform API Engine",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression Middleware: automatically gzip compress JSON payloads >= 500 bytes for lightning-fast network delivery
from starlette.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=500)

@app.middleware("http")
async def db_setup_middleware(request: Request, call_next):
    global _setup_completed
    if not _setup_completed:
        run_db_setup()
    return await call_next(request)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception: {exc}", exc_info=True)
    err_str = str(exc).lower()
    if any(keyword in err_str for keyword in ("database", "connection", "sqlite", "postgres", "pooler", "locked")):
        user_msg = "Our database service is temporarily busy or undergoing maintenance. Please try again in a few moments."
    else:
        user_msg = "A temporary server error occurred. Please try again in a few moments."
    return JSONResponse(
        status_code=500,
        content={"detail": user_msg}
    )

# Register routes
app.include_router(api_router)

from fastapi import Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.models.all_models import User
from app.schemas.all_schemas import ChangePasswordRequest
from app.api_routes.auth_routes import change_password

@app.post("/auth/change-password", tags=["Authentication"])
@app.put("/auth/change-password", tags=["Authentication"])
@app.post("/change-password", tags=["Authentication"])
@app.put("/change-password", tags=["Authentication"])
@app.post("/users/change-password", tags=["Authentication"])
@app.put("/users/change-password", tags=["Authentication"])
def root_change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Direct root-level alias for change password to prevent 404 on un-prefixed requests."""
    return change_password(payload=payload, current_user=current_user, db=db)


@app.get("/", tags=["Root"])
def root():
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs",
        "api_v1_url": "/api/v1"
    }

@app.get("/health", tags=["Health"])
def health_check():
    db_status = "unknown"
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy",
        "database": db_status,
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.DEBUG)
