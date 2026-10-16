import sys
import os
import sqlite3

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_dir)

from app.database.session import SessionLocal
from app.models.all_models import Program

# 1. Update Supabase PostgreSQL
with SessionLocal() as db:
    # FSD
    p_fsd = db.query(Program).filter(Program.id == 'prog-fse-001').first()
    if p_fsd:
        p_fsd.title = 'Full Stack Development'
        p_fsd.code = 'FSD-2026'
        p_fsd.description = 'Comprehensive Full Stack Development Curriculum (React, TypeScript, Node.js, Python, FastAPI, PostgreSQL, Docker, Git)'
        p_fsd.skills = 'React, TypeScript, Node.js, Python, FastAPI, PostgreSQL, Docker, Git'
        p_fsd.is_active = True

    # AIML
    p_aiml = db.query(Program).filter(Program.id == 'df82531e-7a16-4313-86c5-9f927c00e260').first()
    if p_aiml:
        p_aiml.title = 'AI/ML'
        p_aiml.code = 'AIML-2026'
        p_aiml.description = 'Advanced Artificial Intelligence & Machine Learning Track (Python, PyTorch, Scikit-Learn, LLMs, NLP, Computer Vision)'
        p_aiml.skills = 'Python, PyTorch, Scikit-Learn, Deep Learning, NLP, LLMs, Computer Vision'
        p_aiml.is_active = True

    # Business Analyst
    p_ba = db.query(Program).filter(Program.id == '627c65ad-437e-483e-85ac-732f6ae48854').first()
    if p_ba:
        p_ba.title = 'Business Analyst'
        p_ba.code = 'BA-2026'
        p_ba.description = 'Business Analytics & Data-Driven Decision Making (SQL, Power BI, Advanced Excel, Data Modeling, Market Analysis)'
        p_ba.skills = 'SQL, Power BI, Excel, Tableau, Data Modeling, Business Intelligence, Product Analytics'
        p_ba.is_active = True

    # Delete unused programs
    for pid in ['97f553b0-b212-47d4-8ec0-7a3e566a9a89', '39be156e-82ac-417a-bd38-303ed1c48e47']:
        p_del = db.query(Program).filter(Program.id == pid).first()
        if p_del:
            db.delete(p_del)

    db.commit()

    print('Supabase Programs:')
    for p in db.query(Program).all():
        print(f' - {p.id}: {p.title} ({p.code})')

# 2. Sync SQLite
for path in [os.path.join(backend_dir, 'netlink_dev.db'), 'netlink_dev.db']:
    if os.path.exists(path):
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute("UPDATE programs SET title='Full Stack Development', code='FSD-2026', is_active=1 WHERE id='prog-fse-001'")
        cur.execute("UPDATE programs SET title='AI/ML', code='AIML-2026', is_active=1 WHERE id='df82531e-7a16-4313-86c5-9f927c00e260'")
        cur.execute("UPDATE programs SET title='Business Analyst', code='BA-2026', is_active=1 WHERE id='627c65ad-437e-483e-85ac-732f6ae48854'")
        cur.execute("DELETE FROM programs WHERE id IN ('97f553b0-b212-47d4-8ec0-7a3e566a9a89', '39be156e-82ac-417a-bd38-303ed1c48e47')")
        conn.commit()
        conn.close()
        print('Synced', path)
