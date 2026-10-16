import sqlite3
import uuid
from datetime import datetime, timedelta

def main():
    conn = sqlite3.connect('backend/netlink_dev.db')
    c = conn.cursor()

    c.execute("SELECT s.id, u.id, u.full_name FROM students s JOIN users u ON s.user_id = u.id WHERE LOWER(u.full_name) LIKE '%vartika%'")
    row = c.fetchone()
    if not row:
        print("Vartika not found")
        return

    student_id, user_id, full_name = row
    print(f"Found student: {full_name} ({student_id})")

    punches = [
        ('2026-09-01', '10:20:00', '18:27:00'),
        ('2026-09-02', '10:11:00', '18:31:00'),
        ('2026-09-03', '12:00:00', '19:01:00'),
        ('2026-09-04', '10:17:00', '17:25:00'),
        ('2026-09-07', '10:07:00', '18:34:00'),
        ('2026-09-08', '11:08:00', '18:19:00'),
        ('2026-09-09', '10:11:00', '18:30:00'),
        ('2026-09-10', '10:25:00', '18:27:00'),
        ('2026-09-11', '10:37:00', '18:26:00'),
        ('2026-09-15', '10:55:00', '18:37:00'),
        ('2026-09-16', '10:07:00', '18:33:00'),
        ('2026-09-17', '10:52:00', '18:39:00'),
        ('2026-09-18', '10:06:00', '18:45:00'),
        ('2026-09-21', '10:16:00', '18:46:00'),
        ('2026-09-22', '11:01:00', '18:36:00'),
        ('2026-09-23', '11:02:00', '18:30:00'),
        ('2026-09-25', '10:51:00', '17:54:00'),
    ]

    for dt_str, in_time, out_time in punches:
        dt_in_ist = datetime.strptime(f"{dt_str} {in_time}", "%Y-%m-%d %H:%M:%S")
        dt_out_ist = datetime.strptime(f"{dt_str} {out_time}", "%Y-%m-%d %H:%M:%S")

        # Convert IST to UTC (IST is UTC + 5:30)
        dt_in_utc = dt_in_ist - timedelta(hours=5, minutes=30)
        dt_out_utc = dt_out_ist - timedelta(hours=5, minutes=30)

        diff_sec = (dt_out_ist - dt_in_ist).total_seconds()
        mins = int(diff_sec // 60)
        hours = round(diff_sec / 3600.0, 2)

        c.execute("SELECT id FROM attendance_daily_records WHERE student_id = ? AND date = ?", (student_id, dt_str))
        existing = c.fetchone()
        if existing:
            c.execute("""
                UPDATE attendance_daily_records
                SET first_punch_in = ?, last_punch_out = ?, total_working_minutes = ?, total_working_hours = ?, punch_count = 2, status = 'PRESENT'
                WHERE id = ?
            """, (dt_in_utc.strftime("%Y-%m-%d %H:%M:%S"), dt_out_utc.strftime("%Y-%m-%d %H:%M:%S"), mins, hours, existing[0]))
        else:
            rec_id = str(uuid.uuid4())
            c.execute("""
                INSERT INTO attendance_daily_records (
                    id, student_id, date, first_punch_in, last_punch_out, total_working_minutes,
                    total_working_hours, punch_count, status, is_regularized, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 2, 'PRESENT', 0, ?, ?)
            """, (
                rec_id, student_id, dt_str,
                dt_in_utc.strftime("%Y-%m-%d %H:%M:%S"), dt_out_utc.strftime("%Y-%m-%d %H:%M:%S"),
                mins, hours,
                dt_in_utc.strftime("%Y-%m-%d %H:%M:%S"), dt_out_utc.strftime("%Y-%m-%d %H:%M:%S")
            ))

    conn.commit()
    conn.close()
    print(f"Successfully synced {len(punches)} September 2026 records for {full_name}!")

if __name__ == "__main__":
    main()
