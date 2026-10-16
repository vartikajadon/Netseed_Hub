import os
import sys
import sqlite3
from datetime import datetime, date
from decimal import Decimal

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine, MetaData, Table, inspect, text
import app.models.all_models
from app.database.session import Base

# Dependency-ordered tables for clean relational insertion
ORDERED_TABLES = [
    "geofences",
    "users",
    "programs",
    "batches",
    "students",
    "devices",
    "consents",
    "face_templates",
    "attendance_events",
    "attendance_daily_records",
    "regularization_requests",
    "no_dues_template_options",
    "no_dues_requests",
    "student_fee_payments",
    "issued_letters",
    "issued_certificates",
    "institution_trainings",
    "institution_students",
    "calendar_events",
    "trainer_leaves",
    "tasks",
    "task_submissions",
    "notifications",
    "audit_logs",
]

def migrate(sqlite_path: str, pg_url: str):
    print("=" * 60)
    print("NETLINK LIFECYCLE PLATFORM: SQLITE -> SUPABASE POSTGRES MIGRATION")
    print("=" * 60)

    # 1. Connect to SQLite
    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"SQLite database file not found at: {sqlite_path}")
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    # 2. Connect to PostgreSQL
    if pg_url.startswith("postgresql://"):
        pg_url_adapted = pg_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif pg_url.startswith("postgres://"):
        pg_url_adapted = pg_url.replace("postgres://", "postgresql+psycopg://", 1)
    else:
        pg_url_adapted = pg_url

    print(f"Connecting to Postgres Supabase database...")
    pg_engine = create_engine(pg_url_adapted, pool_pre_ping=True)

    # Test connection
    with pg_engine.connect() as conn:
        res = conn.execute(text("SELECT version();")).fetchone()
        print(f"Connected to PostgreSQL: {res[0]}")

    # 3. Create all schema tables in PostgreSQL from SQLAlchemy metadata
    print("\nEnsuring all tables exist in target PostgreSQL database...")
    Base.metadata.create_all(bind=pg_engine)
    print("Schema verified in PostgreSQL.")

    # 4. Migrate tables in ordered sequence
    pg_metadata = MetaData()
    pg_metadata.reflect(bind=pg_engine)

    total_migrated_rows = 0

    with pg_engine.begin() as pg_conn:
        # Disable triggers/FK checks temporarily if superuser, or handle via clean dependency ordering
        for table_name in ORDERED_TABLES:
            if table_name not in Base.metadata.tables:
                continue

            # Check if table exists in SQLite
            sqlite_cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if sqlite_cursor.fetchone()[0] == 0:
                print(f"Skipping {table_name}: not in SQLite")
                continue

            # Read rows from SQLite
            sqlite_cursor.execute(f'SELECT * FROM "{table_name}"')
            rows = sqlite_cursor.fetchall()
            row_count = len(rows)

            if row_count == 0:
                print(f"  {table_name}: 0 rows (empty)")
                continue

            print(f"  Migrating '{table_name}': {row_count} rows...")

            pg_table = Table(table_name, pg_metadata, autoload_with=pg_engine)
            pg_col_types = {c.name: c.type for c in pg_table.columns}

            # Convert row dictionaries
            batch_inserts = []
            for r in rows:
                row_dict = dict(r)
                clean_dict = {}

                for col_name, val in row_dict.items():
                    if col_name not in pg_col_types:
                        continue  # Skip columns not in schema

                    col_type_str = str(pg_col_types[col_name]).upper()

                    # Handle Booleans (SQLite integers 0/1 -> True/False)
                    if "BOOLEAN" in col_type_str or "BOOL" in col_type_str:
                        if val is not None:
                            val = bool(val)

                    # Handle Date/DateTime strings
                    elif ("DATETIME" in col_type_str or "TIMESTAMP" in col_type_str) and isinstance(val, str):
                        try:
                            # Trim microseconds or parse ISO format
                            if "T" in val:
                                val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                            else:
                                val = datetime.fromisoformat(val)
                        except Exception:
                            pass
                    elif "DATE" in col_type_str and isinstance(val, str) and not ("DATETIME" in col_type_str):
                        try:
                            val = date.fromisoformat(val[:10])
                        except Exception:
                            pass

                    # Handle Numerics / Decimals
                    elif ("NUMERIC" in col_type_str or "DECIMAL" in col_type_str) and val is not None:
                        try:
                            val = Decimal(str(val))
                        except Exception:
                            pass

                    clean_dict[col_name] = val

                batch_inserts.append(clean_dict)

            if batch_inserts:
                # Delete existing rows in target table to prevent duplicate key errors on re-run
                pg_conn.execute(pg_table.delete())
                pg_conn.execute(pg_table.insert(), batch_inserts)
                total_migrated_rows += len(batch_inserts)
                print(f"    -> Inserted {len(batch_inserts)} rows into PostgreSQL.")

    print("\n" + "=" * 60)
    print(f"MIGRATION COMPLETE! Successfully transferred {total_migrated_rows} rows to PostgreSQL.")
    print("=" * 60)

    # 5. Verification: Count check
    print("\nVerifying row counts in PostgreSQL:")
    with pg_engine.connect() as conn:
        for table_name in ORDERED_TABLES:
            if table_name in Base.metadata.tables:
                cnt = conn.execute(text(f'SELECT count(*) FROM "{table_name}"')).scalar()
                print(f"  - {table_name}: {cnt} rows")

    sqlite_conn.close()

if __name__ == "__main__":
    sqlite_file = os.path.join(backend_dir, "netlink_dev.db")
    if len(sys.argv) > 1:
        pg_uri = sys.argv[1]
    else:
        from app.configuration.config import settings
        pg_uri = settings.DATABASE_URL

    if not pg_uri or "sqlite" in pg_uri:
        print("Please provide the PostgreSQL Supabase connection URI as an argument:")
        print("python scratch/migrate_sqlite_to_postgres.py 'postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres'")
        sys.exit(1)

    migrate(sqlite_file, pg_uri)
