import os
import sys
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BASE_DIR, "backend", "netlink_dev.db")

sys.path.append(os.path.join(BASE_DIR, "backend"))
from app.database.session import engine
import app.models.all_models
from sqlalchemy import text

def apply_migrations():
    print(f"Applying metadata & migrations to database dialect: '{engine.dialect.name}'...")

    # Re-create any missing tables from SQLAlchemy Metadata
    app.models.all_models.Base.metadata.create_all(bind=engine)

    if engine.dialect.name == "postgresql":
        with engine.connect() as conn:
            # Batches
            conn.execute(text("ALTER TABLE batches ADD COLUMN IF NOT EXISTS batch_type VARCHAR(50) DEFAULT 'TECH_MASTER';"))
            conn.execute(text("ALTER TABLE batches ADD COLUMN IF NOT EXISTS training_duration_months INTEGER DEFAULT 6;"))
            conn.execute(text("ALTER TABLE batches ADD COLUMN IF NOT EXISTS internship_duration_months INTEGER DEFAULT 6;"))
            # Students
            conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS total_fees DECIMAL(10, 2);"))
            conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'ONLINE';"))
            conn.execute(text("ALTER TABLE students ADD COLUMN IF NOT EXISTS installment_type VARCHAR(50) DEFAULT 'ONE_TIME';"))
            # Users
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;"))
            conn.commit()
            print("PostgreSQL columns verified and updated!")

    db_candidates = [
        os.path.join(BASE_DIR, "backend", "netlink_dev.db"),
        os.path.join(BASE_DIR, "netlink_dev.db"),
    ]
    for db_path in db_candidates:
        if not os.path.exists(db_path):
            continue
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 1. Batches table columns
        cursor.execute("PRAGMA table_info(batches)")
        batch_cols = [row[1] for row in cursor.fetchall()]
        if "batch_type" not in batch_cols:
            print("Adding 'batch_type' to batches...")
            cursor.execute("ALTER TABLE batches ADD COLUMN batch_type VARCHAR(50) DEFAULT 'TECH_MASTER'")
        if "training_duration_months" not in batch_cols:
            print("Adding 'training_duration_months' to batches...")
            cursor.execute("ALTER TABLE batches ADD COLUMN training_duration_months INTEGER DEFAULT 6")
        if "internship_duration_months" not in batch_cols:
            print("Adding 'internship_duration_months' to batches...")
            cursor.execute("ALTER TABLE batches ADD COLUMN internship_duration_months INTEGER DEFAULT 6")

        # 2. Students table columns
        cursor.execute("PRAGMA table_info(students)")
        student_cols = [row[1] for row in cursor.fetchall()]
        if "total_fees" not in student_cols:
            print("Adding 'total_fees' to students...")
            cursor.execute("ALTER TABLE students ADD COLUMN total_fees DECIMAL(10, 2)")
        if "payment_mode" not in student_cols:
            print("Adding 'payment_mode' to students...")
            cursor.execute("ALTER TABLE students ADD COLUMN payment_mode VARCHAR(50) DEFAULT 'ONLINE'")
        if "installment_type" not in student_cols:
            print("Adding 'installment_type' to students...")
            cursor.execute("ALTER TABLE students ADD COLUMN installment_type VARCHAR(50) DEFAULT 'ONE_TIME'")

        # 3. Users table password management columns
        cursor.execute("PRAGMA table_info(users)")
        user_cols = [row[1] for row in cursor.fetchall()]
        if "password_hash" not in user_cols:
            print("Adding 'password_hash' to users...")
            cursor.execute("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)")
        if "must_change_password" not in user_cols:
            print("Adding 'must_change_password' to users...")
            cursor.execute("ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0")

        conn.commit()
        conn.close()

    print("All database migrations and columns verified successfully!")

if __name__ == "__main__":
    apply_migrations()
