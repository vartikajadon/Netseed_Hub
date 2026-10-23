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
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_latitude NUMERIC(10, 8)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_longitude NUMERIC(11, 8)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_latitude NUMERIC(10, 8)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout_longitude NUMERIC(11, 8)",
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
    ]

    try:
        with engine.connect() as conn:
            for stmt in statements:
                try:
                    conn.execute(text(stmt))
                    conn.commit()
                except Exception:
                    try:
                        raw_stmt = stmt.replace(" IF NOT EXISTS", "")
                        conn.execute(text(raw_stmt))
                        conn.commit()
                    except Exception:
                        pass
        _setup_completed = True
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

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

# Register routes
app.include_router(api_router)

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
