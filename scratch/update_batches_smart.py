import os
import sys
import sqlite3
from datetime import date

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.database.session import SessionLocal
from app.models.all_models import Batch

# 1. Update Supabase
with SessionLocal() as db:
    # A
    ba = db.query(Batch).filter(Batch.id == 'batch-2026-a').first()
    if ba:
        ba.name = 'Batch 2026-A (Tech Masters)'
        ba.batch_type = 'TECH_MASTER'
        ba.training_duration_months = 6
        ba.internship_duration_months = 6
        ba.start_date = date(2026, 1, 15)
        ba.end_date = date(2027, 1, 15)
        ba.status = 'ACTIVE'

    # B1
    bb1 = db.query(Batch).filter(Batch.id == 'batch-2026-b').first()
    if bb1:
        bb1.name = 'Batch 2026-B1 (Short Duration Course)'
        bb1.batch_type = 'SHORT_DURATION'
        bb1.training_duration_months = 3
        bb1.internship_duration_months = 3
        bb1.start_date = date(2026, 2, 1)
        bb1.end_date = date(2026, 8, 1)
        bb1.status = 'ACTIVE'

    # B2
    bb2 = db.query(Batch).filter(Batch.id == 'batch-2026-b2').first()
    if bb2:
        bb2.name = 'Batch 2026-B2 (Short Duration Course)'
        bb2.batch_type = 'SHORT_DURATION'
        bb2.training_duration_months = 3
        bb2.internship_duration_months = 3
        bb2.start_date = date(2026, 7, 15)
        bb2.end_date = date(2027, 1, 15)
        bb2.status = 'ACTIVE'

    # C
    bc = db.query(Batch).filter(Batch.id == 'batch-2026-c').first()
    if bc:
        bc.name = 'Batch 2026-C (Internship)'
        bc.batch_type = 'INTERNSHIP'
        bc.training_duration_months = 1
        bc.internship_duration_months = 3
        bc.start_date = date(2026, 3, 1)
        bc.end_date = date(2026, 7, 1)
        bc.status = 'ACTIVE'

    db.commit()

    print("Updated Batches in Supabase:")
    for b in db.query(Batch).all():
        print(f"  • {b.id}: {b.name} [{b.batch_type}] -> {b.training_duration_months}m T + {b.internship_duration_months}m I | {b.start_date} ~ {b.end_date}")

# 2. Update SQLite
for path in [os.path.join(backend_dir, 'netlink_dev.db'), 'netlink_dev.db']:
    if os.path.exists(path):
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute("UPDATE batches SET name='Batch 2026-A (Tech Masters)', batch_type='TECH_MASTER', training_duration_months=6, internship_duration_months=6, start_date='2026-01-15', end_date='2027-01-15', status='ACTIVE' WHERE id='batch-2026-a'")
        cur.execute("UPDATE batches SET name='Batch 2026-B1 (Short Duration Course)', batch_type='SHORT_DURATION', training_duration_months=3, internship_duration_months=3, start_date='2026-02-01', end_date='2026-08-01', status='ACTIVE' WHERE id='batch-2026-b'")
        cur.execute("UPDATE batches SET name='Batch 2026-B2 (Short Duration Course)', batch_type='SHORT_DURATION', training_duration_months=3, internship_duration_months=3, start_date='2026-07-15', end_date='2027-01-15', status='ACTIVE' WHERE id='batch-2026-b2'")
        cur.execute("UPDATE batches SET name='Batch 2026-C (Internship)', batch_type='INTERNSHIP', training_duration_months=1, internship_duration_months=3, start_date='2026-03-01', end_date='2026-07-01', status='ACTIVE' WHERE id='batch-2026-c'")
        conn.commit()
        conn.close()
        print("Synced SQLite:", path)
