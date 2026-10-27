import os
import sys
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.join(BASE_DIR, "backend", "netlink_dev.db")

sys.path.append(os.path.join(BASE_DIR, "backend"))
from app.database.session import engine
import app.models.all_models

def apply_migrations():
    print(f"Checking database at '{DB_FILE}'...")

    # Re-create any missing tables from SQLAlchemy Metadata
    app.models.all_models.Base.metadata.create_all(bind=engine)

    if os.path.exists(DB_FILE):
        conn = sqlite3.connect(DB_FILE)
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
