import os
import sys
import random
import sqlite3

# Set backend path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.database.session import SessionLocal
from app.models.all_models import Student, Batch, User

def run_assignment():
    print("==================================================")
    print("ASSIGNING STUDENTS TO BATCHES RANDOMLY")
    print("==================================================")

    with SessionLocal() as db:
        students = db.query(Student).all()
        batches = db.query(Batch).all()

        if not batches:
            print("No batches found!")
            return

        print(f"Total students: {len(students)}")
        print(f"Total batches: {len(batches)}")

        # Randomize students
        shuffled_students = list(students)
        random.shuffle(shuffled_students)

        batch_assignments = {b.id: [] for b in batches}
        batch_lookup = {b.id: b for b in batches}

        # 1. Guarantee every batch has at least one student
        for i, b in enumerate(batches):
            s = shuffled_students[i]
            batch_assignments[b.id].append(s)

        # 2. Distribute the remaining students randomly across batches
        for s in shuffled_students[len(batches):]:
            chosen_batch = random.choice(batches)
            batch_assignments[chosen_batch.id].append(s)

        # 3. Apply updates to Supabase PostgreSQL
        for b_id, s_list in batch_assignments.items():
            b = batch_lookup[b_id]
            for s in s_list:
                s.batch_id = b.id
                s.batch_type = b.batch_type
                if b.program_id:
                    s.program_id = b.program_id
                if b.mentor_id:
                    s.mentor_id = b.mentor_id

        db.commit()

        print("\nSupabase PostgreSQL Update Summary:")
        for b_id, s_list in batch_assignments.items():
            b = batch_lookup[b_id]
            print(f"\nBatch: {b.name} ({b.id}) [{b.batch_type}] -> {len(s_list)} Students")
            for s in s_list:
                user = db.query(User).filter(User.id == s.user_id).first()
                name = user.full_name if user else "N/A"
                print(f"  - {s.roll_number}: {name} ({s.id})")

    # 4. Sync local SQLite files if they exist
    for db_path in [os.path.join(backend_dir, "netlink_dev.db"), "netlink_dev.db"]:
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            for b_id, s_list in batch_assignments.items():
                b = batch_lookup[b_id]
                for s in s_list:
                    cur.execute(
                        "UPDATE students SET batch_id = ?, batch_type = ?, program_id = ?, mentor_id = ? WHERE id = ?",
                        (b.id, b.batch_type, b.program_id, b.mentor_id, s.id)
                    )
            conn.commit()
            conn.close()
            print(f"\nSynced local SQLite: {db_path}")

    print("\nBatch assignment successfully completed!")

if __name__ == "__main__":
    run_assignment()
