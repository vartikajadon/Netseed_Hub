import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.configuration.config import settings

db_url = settings.DATABASE_URL
connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)

    # Supabase Transaction Pooler Optimization:
    # Port 5432 in Supabase Pooler is Session mode (limited to 15 clients).
    # Port 6543 is Transaction mode (supports high concurrency serverless connections).
    if "pooler.supabase.com:5432" in db_url:
        db_url = db_url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")

    if "pooler.supabase.com" in db_url or os.environ.get("VERCEL") == "1" or "AWS_LAMBDA_FUNCTION_NAME" in os.environ:
        engine_kwargs["poolclass"] = NullPool
        connect_args["prepare_threshold"] = None

if not (db_url.startswith("sqlite") or "pooler.supabase.com" in db_url or os.environ.get("VERCEL") == "1" or "AWS_LAMBDA_FUNCTION_NAME" in os.environ):
    engine_kwargs.setdefault("pool_size", 10)
    engine_kwargs.setdefault("max_overflow", 20)
    engine_kwargs.setdefault("pool_recycle", 1800)

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs
)

if db_url.startswith("sqlite"):
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")
            cursor.execute("PRAGMA temp_store=MEMORY")
        except Exception:
            pass
        finally:
            cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
