"""
NETSEED HUB - AUTOMATED SUPABASE POSTGRESQL MIGRATION SCRIPT
Transfers all data from the local SQLite database into remote Supabase PostgreSQL.

Usage:
    python migrate_to_supabase.py
    or
    python migrate_to_supabase.py "postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
"""

import os
import sys
import sqlite3
from datetime import datetime, date
from decimal import Decimal
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(BASE_DIR, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load environment variables
load_dotenv(os.path.join(backend_dir, ".env"))

from sqlalchemy import create_engine, MetaData, Table, inspect, text
from app.database.session import Base
import app.models.all_models

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
    "user_location_logs",
    "assessments",
    "assessment_submissions",
    "trainer_feedbacks",
]

def run_migration(pg_url: str = None, sqlite_path: str = None):
    print("=" * 70)
    print(" NETSEED HUB: SQLITE -> SUPABASE POSTGRESQL MIGRATION")
    print("=" * 70)

    if not sqlite_path:
        for candidate in ["netlink_dev.db", "backend/netlink_dev.db", "backend/app/database/bundled_dev.db"]:
            if os.path.exists(candidate):
                sqlite_path = candidate
                break

    if not sqlite_path or not os.path.exists(sqlite_path):
        print(f"[ERROR] Could not find local SQLite database file.")
        return False

    print(f"Source SQLite database: {sqlite_path}")

    # Determine PostgreSQL URL
    if not pg_url:
        pg_url = os.environ.get("SUPABASE_DATABASE_URL") or os.environ.get("DATABASE_URL")
        # Check if default is sqlite
        if not pg_url or pg_url.startswith("sqlite"):
            # Try to read commented URL from backend/.env
            env_file = os.path.join(backend_dir, ".env")
            if os.path.exists(env_file):
                with open(env_file, "r") as f:
                    for line in f:
                        if "DATABASE_URL=postgresql" in line or "DATABASE_URL=postgres" in line:
                            pg_url = line.strip().lstrip("#").strip()
                            if pg_url.startswith("DATABASE_URL="):
                                pg_url = pg_url.split("=", 1)[1].strip()
                            break

    if not pg_url or pg_url.startswith("sqlite"):
        print("\n[NOTE] No remote PostgreSQL URL found.")
        print("Please provide the Supabase PostgreSQL URL:")
        print("  python migrate_to_supabase.py 'postgresql://postgres.<project-ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'")
        return False

    # Adapt driver to psycopg
    if pg_url.startswith("postgresql://"):
        pg_url_adapted = pg_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif pg_url.startswith("postgres://"):
        pg_url_adapted = pg_url.replace("postgres://", "postgresql+psycopg://", 1)
    else:
        pg_url_adapted = pg_url

    print(f"Target PostgreSQL URL: {pg_url_adapted.split('@')[-1] if '@' in pg_url_adapted else 'PostgreSQL'}")

    try:
        pg_engine = create_engine(
            pg_url_adapted,
            connect_args={"connect_timeout": 7},
            pool_pre_ping=True
        )
        with pg_engine.connect() as conn:
            ver = conn.execute(text("SELECT version();")).fetchone()
            print(f"[OK] Successfully connected to PostgreSQL: {ver[0][:50]}...")
    except Exception as e:
        print(f"\n[ERROR] Connection to Supabase PostgreSQL failed: {e}")
        print("\nCommon reasons:")
        print("  1. The Supabase project is currently paused (due to 7 days free inactivity).")
        print("     -> Log in to https://supabase.com/dashboard and click 'Resume project'.")
        print("  2. Incorrect project password or host.")
        print("\nAlternative:")
        print("  You can also copy the contents of 'supabase_seed.sql' directly into the")
        print("  Supabase SQL Editor on your dashboard to populate all tables instantly!")
        return False

    print("\nEnsuring all tables exist in target PostgreSQL database...")
    Base.metadata.create_all(bind=pg_engine)
    print("[OK] Schema verified in PostgreSQL.")

    pg_metadata = MetaData()
    pg_metadata.reflect(bind=pg_engine)

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    total_migrated_rows = 0

    with pg_engine.begin() as pg_conn:
        for table_name in ORDERED_TABLES:
            if table_name not in Base.metadata.tables:
                continue

            sqlite_cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if sqlite_cursor.fetchone()[0] == 0:
                continue

            sqlite_cursor.execute(f'SELECT * FROM "{table_name}"')
            rows = sqlite_cursor.fetchall()
            row_count = len(rows)

            if row_count == 0:
                continue

            print(f"  Migrating '{table_name}' ({row_count} rows)...", end=" ")

            pg_table = Table(table_name, pg_metadata, autoload_with=pg_engine)
            pg_col_types = {c.name: c.type for c in pg_table.columns}

            batch_inserts = []
            for r in rows:
                row_dict = dict(r)
                clean_dict = {}

                for col_name, val in row_dict.items():
                    if col_name not in pg_col_types:
                        continue

                    col_type_str = str(pg_col_types[col_name]).upper()

                    if "BOOLEAN" in col_type_str or "BOOL" in col_type_str:
                        if val is not None:
                            val = bool(val)
                    elif ("DATETIME" in col_type_str or "TIMESTAMP" in col_type_str) and isinstance(val, str):
                        try:
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
                    elif ("NUMERIC" in col_type_str or "DECIMAL" in col_type_str or "FLOAT" in col_type_str) and isinstance(val, (int, float, str)):
                        try:
                            val = Decimal(str(val))
                        except Exception:
                            pass

                    clean_dict[col_name] = val

                batch_inserts.append(clean_dict)

            from sqlalchemy.dialects.postgresql import insert as pg_insert
            stmt = pg_insert(pg_table).values(batch_inserts)
            if "id" in pg_table.c:
                stmt = stmt.on_conflict_do_nothing(index_elements=["id"])
            else:
                stmt = stmt.on_conflict_do_nothing()

            result = pg_conn.execute(stmt)
            print(f"[Done - {row_count} processed]")
            total_migrated_rows += row_count

    sqlite_conn.close()
    print("=" * 70)
    print(f" MIGRATION COMPLETE! Total records processed: {total_migrated_rows}")
    print("=" * 70)
    return True

if __name__ == "__main__":
    url_arg = sys.argv[1] if len(sys.argv) > 1 else None
    run_migration(pg_url=url_arg)

