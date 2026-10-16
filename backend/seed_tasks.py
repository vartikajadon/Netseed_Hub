import sqlite3, uuid
from datetime import datetime, timezone, timedelta

conn = sqlite3.connect('netlink_dev.db')
c = conn.cursor()

c.execute("DELETE FROM task_submissions")
c.execute("DELETE FROM tasks")

task_id = str(uuid.uuid4())
now_str = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
due_str = (datetime.now(timezone.utc) + timedelta(days=5)).strftime('%Y-%m-%d %H:%M:%S')

c.execute('''
    INSERT INTO tasks (id, title, description, batch_id, mentor_id, due_date, assign_to_all, max_marks, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
''', (
    task_id,
    'Full Stack Authentication Pipeline & JWT Cookies',
    'Build a secure JWT authentication flow with refresh tokens and HTTP-only cookie management.',
    'batch-2026-a',
    'usr-mentor-001',
    due_str,
    1,
    100,
    now_str
))

c.execute("SELECT id FROM students WHERE batch_id = 'batch-2026-a' LIMIT 2")
st_rows = c.fetchall()

if st_rows:
    sub_id_1 = str(uuid.uuid4())
    c.execute('''
        INSERT INTO task_submissions (
            id, task_id, student_id, submission_type, code_link, text_output,
            status, max_marks, ack_sent_to_student, ack_sent_to_hr, submitted_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        sub_id_1, task_id, st_rows[0][0], 'CODE_LINK',
        'https://github.com/netseed-trainee/auth-jwt-service',
        'Completed all auth endpoints. Unit tests passing with 98% coverage.',
        'PENDING_EVALUATION', 100, 0, 0,
        now_str, now_str
    ))

if len(st_rows) > 1:
    sub_id_2 = str(uuid.uuid4())
    c.execute('''
        INSERT INTO task_submissions (
            id, task_id, student_id, submission_type, code_link, text_output,
            status, max_marks, ack_sent_to_student, ack_sent_to_hr, submitted_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        sub_id_2, task_id, st_rows[1][0], 'TEXT_OUTPUT',
        None,
        'Implemented custom password hashing with Argon2 and bcrypt fallback.\nAPI Output:\nPOST /api/v1/auth/token -> 200 OK\nToken Payload: { sub: "student", exp: 1775000000 }\nTokens refreshed successfully.',
        'PENDING_EVALUATION', 100, 0, 0,
        now_str, now_str
    ))

conn.commit()
print('Sample task and submissions seeded successfully')
conn.close()
