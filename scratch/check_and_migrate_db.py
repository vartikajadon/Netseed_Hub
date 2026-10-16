import os
import sqlite3

db_paths = ["backend/netlink_dev.db", "netlink_dev.db", "backend/app.db", "app.db"]

needed_program_columns = {
    "mentor_id": "TEXT",
    "max_students": "INTEGER",
    "start_date": "DATE",
    "end_date": "DATE",
    "program_type": "TEXT",
    "skills": "TEXT"
}

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Migrating Programs table at {db_path}...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        existing = [info[1] for info in cursor.execute("PRAGMA table_info(programs)").fetchall()]
        print(f"Existing columns in 'programs': {existing}")
        
        for col, col_type in needed_program_columns.items():
            if col not in existing:
                print(f"Adding column '{col}' to {db_path}...")
                cursor.execute(f"ALTER TABLE programs ADD COLUMN {col} {col_type}")
        
        conn.commit()
        conn.close()
        print(f"Successfully migrated {db_path}!")
