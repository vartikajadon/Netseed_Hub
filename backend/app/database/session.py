import os
import logging
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.configuration.config import settings, SQLITE_DEFAULT_URL

logger = logging.getLogger(__name__)

Base = declarative_base()

def create_sqlite_engine(url: str):
    eng = create_engine(
        url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )
    @event.listens_for(eng, "connect")
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
    return eng

def create_postgres_engine(url: str):
    connect_args = {}
    engine_kwargs = {"pool_pre_ping": True}

    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)

    if "pooler.supabase.com:5432" in url:
        url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")

    if "pooler.supabase.com" in url or os.environ.get("VERCEL") == "1" or "AWS_LAMBDA_FUNCTION_NAME" in os.environ:
        engine_kwargs["poolclass"] = NullPool
        connect_args["prepare_threshold"] = None

    connect_args["connect_timeout"] = 3

    if not ("pooler.supabase.com" in url or os.environ.get("VERCEL") == "1" or "AWS_LAMBDA_FUNCTION_NAME" in os.environ):
        engine_kwargs.setdefault("pool_size", 10)
        engine_kwargs.setdefault("max_overflow", 20)
        engine_kwargs.setdefault("pool_recycle", 1800)

    return create_engine(url, connect_args=connect_args, **engine_kwargs)


db_url = settings.DATABASE_URL
_is_primary_postgres = not db_url.startswith("sqlite")

if _is_primary_postgres:
    try:
        candidate_engine = create_postgres_engine(db_url)
        with candidate_engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
        engine = candidate_engine
        logger.info(f"Connected successfully to primary PostgreSQL database: {engine.url.render_as_string(hide_password=True)}")
    except Exception as e:
        logger.warning(
            f"Primary database connection failed ({e}). Automatically engaging resilient SQLite fallback: {SQLITE_DEFAULT_URL}"
        )
        engine = create_sqlite_engine(SQLITE_DEFAULT_URL)
else:
    engine = create_sqlite_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def switch_to_sqlite_fallback():
    global engine, SessionLocal
    if str(engine.url).startswith("sqlite"):
        return
    logger.warning(f"Dynamically switching database engine to SQLite fallback: {SQLITE_DEFAULT_URL}")
    engine = create_sqlite_engine(SQLITE_DEFAULT_URL)
    SessionLocal.configure(bind=engine)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as ex:
        logger.warning(f"Error creating metadata on SQLite fallback: {ex}")

def get_db():
    global engine, SessionLocal
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        from sqlalchemy.exc import OperationalError
        if isinstance(e, OperationalError) and not str(engine.url).startswith("sqlite"):
            logger.warning(f"Database connection error during query ({e}). Switching to SQLite fallback...")
            switch_to_sqlite_fallback()
        raise
    finally:
        try:
            db.close()
        except Exception:
            pass
