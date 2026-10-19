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

def run_db_setup():
    """Safely runs DDL migrations and table creation without crashing startup."""
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        logger.warning(f"Base.metadata.create_all deferred or encountered error: {e}")

    from sqlalchemy import text
    statements = [
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE",
        "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS student_id VARCHAR(36)",
        "ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_curriculum_published BOOLEAN DEFAULT TRUE",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS dropout_reason TEXT",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS dropout_date DATE",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS dropout_marked_by VARCHAR(36)",
    ]
    for stmt in statements:
        try:
            with engine.connect() as conn:
                conn.execute(text(stmt))
                conn.commit()
        except Exception:
            try:
                raw_stmt = stmt.replace(" IF NOT EXISTS", "")
                with engine.connect() as conn:
                    conn.execute(text(raw_stmt))
                    conn.commit()
            except Exception:
                pass

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
