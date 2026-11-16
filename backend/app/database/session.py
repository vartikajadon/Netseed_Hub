import os
import logging
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool
from app.configuration.config import settings, SQLITE_DEFAULT_URL

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
connect_args = {}
engine_kwargs = {"pool_pre_ping": True}
is_sqlite = False

if not db_url or db_url.startswith("sqlite"):
    is_sqlite = True
    db_url = SQLITE_DEFAULT_URL
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

    # Connection timeout (5s) to avoid hanging
    connect_args["connect_timeout"] = 5

    # Always disable prepared statements on PgBouncer Transaction Pooler to eliminate prepared-statement collisions
    connect_args["prepare_threshold"] = None

    # TCP Keepalives keep socket alive across network boundaries and prevent cold TCP disconnects
    connect_args["keepalives"] = 1
    connect_args["keepalives_idle"] = 30
    connect_args["keepalives_interval"] = 10
    connect_args["keepalives_count"] = 5

    # High-performance persistent connection pooling:
    # Maintain warm connections across requests to eliminate repetitive 200-800ms TCP + SSL handshakes
    engine_kwargs.setdefault("pool_size", 10)
    engine_kwargs.setdefault("max_overflow", 20)
    engine_kwargs.setdefault("pool_recycle", 300)
    engine_kwargs.setdefault("pool_pre_ping", True)
    engine_kwargs.setdefault("pool_timeout", 10)

    # Pre-flight check: verify that the remote database is actually reachable and responsive
    try:
        test_engine = create_engine(
            db_url,
            connect_args=connect_args,
            **engine_kwargs
        )
        with test_engine.connect() as test_conn:
            test_conn.execute(text("SELECT 1"))
        engine = test_engine
        logger.info("Successfully connected to primary PostgreSQL database.")
    except Exception as e:
        logger.warning(
            f"Primary PostgreSQL database connection failed ({e}). "
            f"Activating resilient SQLite database at {SQLITE_DEFAULT_URL}."
        )
        is_sqlite = True
        db_url = SQLITE_DEFAULT_URL
        connect_args = {"check_same_thread": False}
        engine_kwargs = {"pool_pre_ping": True}

if is_sqlite:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        **engine_kwargs
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.execute("PRAGMA mmap_size=268435456")
            cursor.execute("PRAGMA busy_timeout=10000")
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
