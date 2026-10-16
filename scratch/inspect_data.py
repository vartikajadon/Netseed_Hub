import sys
sys.path.append('backend')
from app.database.session import SessionLocal
from app.models.all_models import Student, Program, Batch, User, Task, TaskSubmission

db = SessionLocal()
print('--- ALL STUDENTS ---')
for s in db.query(Student).all():
    u = db.query(User).filter(User.id == s.user_id).first()
    p = db.query(Program).filter(Program.id == s.program_id).first() if s.program_id else None
    b = db.query(Batch).filter(Batch.id == s.batch_id).first() if s.batch_id else None
    uname = u.full_name if u else "Unknown"
    uemail = u.email if u else "No email"
    pname = p.title if p else f"NO PROGRAM ({s.program_id})"
    bname = b.name if b else "NO BATCH"
    print(f"Student: {uname} ({uemail}) | Program: {pname} | Batch: {bname} | BatchType: {s.batch_type}")

print('\n--- ALL BATCHES ---')
for b in db.query(Batch).all():
    p = db.query(Program).filter(Program.id == b.program_id).first() if b.program_id else None
    pname = p.title if p else f"NO PROGRAM ({b.program_id})"
    print(f"Batch: {b.id} | {b.name} | Type: {b.batch_type} | Program: {pname} | Training: {b.training_duration_months}m | Internship: {b.internship_duration_months}m")

print('\n--- ALL TASKS ---')
for t in db.query(Task).all():
    b = db.query(Batch).filter(Batch.id == t.batch_id).first() if t.batch_id else None
    subs = db.query(TaskSubmission).filter(TaskSubmission.task_id == t.id).count()
    print(f"Task: {t.title} | Batch: {b.name if b else t.batch_id} | Due: {t.due_date} | Submissions: {subs}")

db.close()
