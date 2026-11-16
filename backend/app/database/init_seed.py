import logging
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from app.models.all_models import (
    User, Program, Batch, Geofence, Student, Device, Consent,
    FaceTemplate, AuditLog, Task
)

logger = logging.getLogger(__name__)

def ensure_baseline_data(db: Session):
    """
    Safely seeds essential baseline entities (geofence, users, programs, batches, students)
    if the database is newly created or empty. Idempotent and crash-proof.
    """
    try:
        # Check if users already exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            return

        logger.info("Initializing baseline seed data for empty database...")

        # 1. Geofence (Netlink Bhopal Campus)
        geo = db.query(Geofence).filter(Geofence.id == "geo-hq-001").first()
        if not geo:
            geo = Geofence(
                id="geo-hq-001",
                name="Netlink Software Group America Inc., Bhopal Campus",
                center_latitude=23.11186100,
                center_longitude=77.51574400,
                radius_meters=100.00,
                address="Mandideep Industrial Area, Bhopal, MP 462046",
                is_active=True
            )
            db.add(geo)

        # 2. Core Users (@netlink.org)
        users_data = [
            ("usr-admin-001", "admin@netlink.org", "Abhishek Verma", "SUPER_ADMIN", "+15550000001"),
            ("usr-hr-001", "hr@netlink.org", "Prerna Verma", "HR", "+15550000002"),
            ("usr-mentor-001", "mentor@netlink.org", "Alex Rivera (Lead Mentor)", "MENTOR", "+15550000003"),
            ("usr-student-001", "student1@netlink.org", "John Doe", "STUDENT", "+15550000004"),
            ("usr-student-002", "student2@netlink.org", "Jane Smith", "STUDENT", "+15550000005"),
        ]

        for uid, email, name, role, phone in users_data:
            u = db.query(User).filter(User.id == uid).first()
            if not u:
                u = User(id=uid, email=email, full_name=name, role=role, phone=phone, is_active=True)
                db.add(u)

        # 3. Programs
        programs_seed = [
            (
                "prog-fse-001",
                "Full Stack Development",
                "FSD-2026",
                "Comprehensive Full Stack Development Curriculum (React, TypeScript, Node.js, Python, FastAPI, PostgreSQL, Docker, Git)",
                "React, TypeScript, Python, FastAPI, PostgreSQL, Docker"
            ),
            (
                "df82531e-7a16-4313-86c5-9f927c00e260",
                "AI/ML",
                "AIML-2026",
                "Advanced Artificial Intelligence & Machine Learning Track (Python, PyTorch, Scikit-Learn, LLMs, NLP, Computer Vision)",
                "Python, PyTorch, Scikit-Learn, Deep Learning, NLP, LLMs"
            ),
            (
                "627c65ad-437e-483e-85ac-732f6ae48854",
                "Business Analyst",
                "BA-2026",
                "Business Analytics & Data-Driven Decision Making (SQL, Power BI, Advanced Excel, Data Modeling)",
                "SQL, Power BI, Excel, Tableau, Data Modeling, Business Intelligence"
            ),
        ]
        for pid, ptitle, pcode, pdesc, pskills in programs_seed:
            p = db.query(Program).filter(Program.id == pid).first()
            if not p:
                p = Program(
                    id=pid,
                    title=ptitle,
                    code=pcode,
                    description=pdesc,
                    skills=pskills,
                    duration_weeks=12,
                    is_active=True,
                    created_by="usr-hr-001"
                )
                db.add(p)

        # 4. Batches
        batches_seed = [
            ("batch-2026-a", "prog-fse-001", "Batch 2026-A (Tech Masters)", "TECH_MASTER", 6, 6, date(2026, 1, 15), date(2027, 1, 15)),
            ("batch-2026-b", "prog-fse-001", "Batch 2026-B1 (Short Duration Course)", "SHORT_DURATION", 3, 3, date(2026, 2, 1), date(2026, 8, 1)),
            ("batch-2026-b2", "prog-fse-001", "Batch 2026-B2 (Short Duration Course)", "SHORT_DURATION", 3, 3, date(2026, 7, 15), date(2027, 1, 15)),
            ("batch-2026-c", "prog-fse-001", "Batch 2026-C (Internship)", "INTERNSHIP", 1, 3, date(2026, 3, 1), date(2026, 7, 1)),
            ("batch-2026-aiml-a", "df82531e-7a16-4313-86c5-9f927c00e260", "Batch 2026-A (Tech Masters)", "TECH_MASTER", 6, 6, date(2026, 1, 15), date(2027, 1, 15)),
            ("batch-2026-aiml-b", "df82531e-7a16-4313-86c5-9f927c00e260", "Batch 2026-B1 (Short Duration Course)", "SHORT_DURATION", 3, 3, date(2026, 2, 1), date(2026, 8, 1)),
            ("batch-2026-ba-a", "627c65ad-437e-483e-85ac-732f6ae48854", "Batch 2026-A (Tech Masters)", "TECH_MASTER", 6, 6, date(2026, 1, 15), date(2027, 1, 15)),
        ]
        for bid, b_pid, b_name, b_type, t_dur, i_dur, s_date, e_date in batches_seed:
            b = db.query(Batch).filter(Batch.id == bid).first()
            if not b:
                b = Batch(
                    id=bid,
                    program_id=b_pid,
                    name=b_name,
                    batch_type=b_type,
                    training_duration_months=t_dur,
                    internship_duration_months=i_dur,
                    start_date=s_date,
                    end_date=e_date,
                    geofence_id="geo-hq-001",
                    mentor_id="usr-mentor-001",
                    status="ACTIVE"
                )
                db.add(b)

        # 5. Core Students
        st1 = db.query(Student).filter(Student.id == "std-001").first()
        if not st1:
            st1 = Student(
                id="std-001",
                user_id="usr-student-001",
                program_id="prog-fse-001",
                batch_id="batch-2026-b",
                mentor_id="usr-mentor-001",
                roll_number="NL-2026-001",
                college_name="Institute of Technology",
                qualification="B.Tech Computer Science",
                domicile="Madhya Pradesh",
                batch_type="SHORT_DURATION",
                total_fees=35000.00,
                payment_mode="ONLINE",
                installment_type="TWO_INSTALLMENTS",
                start_date=date(2026, 2, 1),
                end_date=date(2026, 8, 1),
                enrollment_status="ACTIVE",
                registered_device_id="dev-std-001",
                face_enrollment_status="ENROLLED"
            )
            db.add(st1)

        st2 = db.query(Student).filter(Student.id == "std-002").first()
        if not st2:
            st2 = Student(
                id="std-002",
                user_id="usr-student-002",
                program_id="prog-fse-001",
                batch_id="batch-2026-a",
                mentor_id="usr-mentor-001",
                roll_number="NL-2026-002",
                college_name="State University of Engineering",
                qualification="B.E. Information Technology",
                domicile="Madhya Pradesh",
                batch_type="TECH_MASTER",
                total_fees=60000.00,
                payment_mode="CASH",
                installment_type="ONE_TIME",
                start_date=date(2026, 1, 15),
                end_date=date(2027, 1, 15),
                enrollment_status="ACTIVE",
                registered_device_id="dev-std-002",
                face_enrollment_status="NOT_ENROLLED"
            )
            db.add(st2)

        # 6. Consent & Face Template for std-001
        cns = db.query(Consent).filter(Consent.id == "cns-std-001").first()
        if not cns:
            cns = Consent(
                id="cns-std-001",
                user_id="usr-student-001",
                student_id="std-001",
                consent_type="FACIAL_BIOMETRIC_ATTENDANCE",
                consent_version="v1.0",
                is_granted=True,
                ip_address="127.0.0.1"
            )
            db.add(cns)

        fct = db.query(FaceTemplate).filter(FaceTemplate.id == "fct-std-001").first()
        if not fct:
            import json, hashlib, numpy as np
            h = hashlib.sha256(b"std-001-baseline").digest()
            rng = np.random.RandomState(int.from_bytes(h[:4], "big"))
            v = rng.randn(512).astype(np.float32)
            v = [round(float(x), 6) for x in (v / np.linalg.norm(v))]
            ref_json = json.dumps({
                "vector": v,
                "fallback_vector": v,
                "dimension": 512,
                "model_version": "Auto-Seed",
                "sample_count": 3
            })
            fct = FaceTemplate(
                id="fct-std-001",
                user_id="usr-student-001",
                student_id="std-001",
                embedding_reference=ref_json,
                confidence_score=0.9850,
                quality_score=0.9600,
                enrolled_by="usr-hr-001",
                consent_id="cns-std-001"
            )
            db.add(fct)

        db.commit()
        logger.info("Baseline seed data initialized successfully.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Baseline seed initialization note: {e}")

