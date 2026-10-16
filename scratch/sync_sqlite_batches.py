import sqlite3
import os

for path in ['backend/netlink_dev.db', 'netlink_dev.db']:
    if not os.path.exists(path):
        continue
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute("UPDATE batches SET name = 'Batch 2026-A (Tech Master)', status = 'ACTIVE' WHERE id = 'batch-2026-a'")
    cur.execute("UPDATE batches SET name = 'Batch 2026-B1 (6 Months Program)', status = 'ACTIVE' WHERE id = 'batch-2026-b'")
    cur.execute(
        """
        INSERT OR REPLACE INTO batches (id, program_id, name, batch_type, training_duration_months, internship_duration_months, start_date, end_date, geofence_id, mentor_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ('batch-2026-b2', 'prog-fse-001', 'Batch 2026-B2 (6 Months Program)', 'SHORT_DURATION', 3, 3, '2026-07-15', '2027-01-15', 'geo-hq-001', 'usr-mentor-001', 'ACTIVE')
    )
    cur.execute(
        """
        INSERT OR REPLACE INTO batches (id, program_id, name, batch_type, training_duration_months, internship_duration_months, start_date, end_date, geofence_id, mentor_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ('batch-2026-c', 'prog-fse-001', 'Batch 2026-C (Internship)', 'INTERNSHIP', 0, 6, '2026-03-01', '2026-09-01', 'geo-hq-001', 'usr-mentor-001', 'ACTIVE')
    )
    conn.commit()
    conn.close()
    print('Synced', path)
