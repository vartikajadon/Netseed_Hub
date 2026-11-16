# Auto-generated comprehensive baseline seed data
import logging
import json
import hashlib
import numpy as np
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.models.all_models import (
    Geofence, User, Program, Batch, Student, Consent, FaceTemplate
)

logger = logging.getLogger(__name__)

def ensure_baseline_data(db: Session):
    """
    Ensures that essential foundational records (users, programs, batches, students, geofences)
    exist in the database. Operates idempotently to guarantee availability on initial startup
    or across cloud deployment environments.
    """
    try:
        # 1. Geofence Zone
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

        # 2. Core Users
        users_data = [
            ("usr-admin-001", "admin@netlink.org", "Abhishek Verma", "SUPER_ADMIN", "+15550000001", "$2b$12$7PsmS.EaEvynwZGUepxMwewgKO4TRmgOHzBuol49DJxlIcKOAGaHW"),
            ("usr-hr-001", "hr@netlink.org", "Prerna Verma", "HR", "+15550000002", "$2b$12$JhZ9N5UV7VKJ1.H1VUPZEuFp4p9KzY4SSNpBbaSbtTH3UDzR8033u"),
            ("usr-mentor-001", "mentor@netlink.org", "Alex Rivera (Lead Mentor)", "MENTOR", "+15550000003", None),
            ("usr-student-001", "student1@netlink.org", "John Doe", "STUDENT", "+15550000004", "$2b$12$27IcyZha2d2teTKRgfJ/geNlfUDXcSoC954Efqav1fwdswul8SxsW"),
            ("usr-student-002", "student2@netlink.org", "Jane Smith", "STUDENT", "+15550000005", None),
            ("71f76264-16cf-4732-bb60-cf2c392f3eb7", "vartika9@gmail.com", "vartika", "STUDENT", "9303211058", None),
            ("ba06a16c-3eab-4406-a937-40212411fda1", "anil9@gmail.com", "Anil Sharma", "STUDENT", "9303211555", None),
            ("9e51a45b-b90c-4900-a678-d160eb06b3d3", "vb@gmail.com", "ngfgh", "STUDENT", "1234543221", None),
            ("9fb15684-3b76-4839-9aa8-d7490e01724a", "trisha@gmail.com", "Trisha", "STUDENT", "1234543221", None),
            ("6325b7ba-da05-4284-99dc-6748b93673a5", "vikrant@gmail.com", "vikrant", "STUDENT", "1234543221", "$2b$12$Nd9r8tvUAo8I0wZKNA7Oq.Qays1hhCBL3UmA6fvWlQ5zGTyy5p2ea"),
            ("2e97406b-6f62-4ef5-b2be-6ea3c8a91b77", "divyam@gmail.com", "Divyam", "STUDENT", "1234543221", None),
            ("d3101e89-3167-409d-b81b-d2eeafa1d17a", "abc@gmail.com", "abc", "STUDENT", "1234543221", "$2b$12$w12hY5a13kExNceWAuqlheNj7fB1d4txxPc7Sej7H62TkzBFjN7xW"),
            ("e002ea4c-773e-41b2-98ab-ed19aec10645", "vartika@gmail.com", "vartika jadon", "STUDENT", "1234543221", "$2b$12$s14zI3xD.jqIVInE5s3E.O2RypJR3ieV5Z2T/NKnKTSiH5.omliX2"),
            ("8930804b-92b4-476b-80f4-074e66f99c32", "ishan@gmail.com", "Ishan", "STUDENT", "1234567890", None),
        ]

        for uid, email, name, role, phone, p_hash in users_data:
            u = db.query(User).filter(User.id == uid).first()
            if not u:
                u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    id=uid,
                    email=email,
                    full_name=name,
                    role=role,
                    phone=phone,
                    password_hash=p_hash,
                    is_active=True
                )
                db.add(u)
            else:
                if p_hash and not u.password_hash:
                    u.password_hash = p_hash

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
        for pid, p_name, code, desc, skills in programs_seed:
            p = db.query(Program).filter(Program.id == pid).first()
            if not p:
                p = Program(
                    id=pid,
                    name=p_name,
                    code=code,
                    description=desc,
                    skills_covered=skills,
                    is_active=True,
                    is_curriculum_published=True
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
        students_seed = [
            ("std-001", "usr-student-001", "prog-fse-001", "batch-2026-b2", "usr-mentor-001", "NL-2026-001", "Institute of Technology", "B.Tech Computer Science", "Madhya Pradesh", "SHORT_DURATION", 60000, "ONLINE", "ONE_TIME", "ACTIVE", "ENROLLED"),
            ("std-002", "usr-student-002", "prog-fse-001", "batch-2026-a", "usr-mentor-001", "NL-2026-002", "State University of Engineering", "B.E. Information Technology", "Madhya Pradesh", "TECH_MASTER", 45000.0, "ONLINE", "ONE_TIME", "ACTIVE", "ENROLLED"),
            ("dfabc148-d8de-4bbc-bd55-f45190da48ec", "ba06a16c-3eab-4406-a937-40212411fda1", "prog-fse-001", "batch-2026-b2", "usr-mentor-001", "NL-2026-739", "lnct", "MBA", "Madhya Pradesh", "SHORT_DURATION", 45000.0, "ONLINE", "ONE_TIME", "ACTIVE", "NOT_ENROLLED"),
            ("33027a22-83f7-4004-a23e-be5db3eb663b", "9e51a45b-b90c-4900-a678-d160eb06b3d3", "prog-fse-001", "batch-2026-b", "usr-mentor-001", "NL-2026-337", "sirt", "bfdf", "Madhya Pradesh", "SHORT_DURATION", 45000.0, "ONLINE", "ONE_TIME", "ACTIVE", "NOT_ENROLLED"),
            ("464b0a6b-743e-4bef-8322-9d0d725346b3", "9fb15684-3b76-4839-9aa8-d7490e01724a", "prog-fse-001", "batch-2026-c", "usr-mentor-001", "NL-2026-868", "sirt", "b.tech", "Madhya Pradesh", "INTERNSHIP", 60000, "ONLINE", "TWO_INSTALLMENTS", "ACTIVE", "ENROLLED"),
            ("12d6d4c6-a879-4dc2-8237-debb6f5e6f62", "6325b7ba-da05-4284-99dc-6748b93673a5", "prog-fse-001", "batch-2026-c", "usr-mentor-001", "NL-2026-242", "sirt", "b.tech", "Madhya Pradesh", "INTERNSHIP", 6000, "ONLINE", "ONE_TIME", "ACTIVE", "ENROLLED"),
            ("243eb9f3-f76e-42c3-87b2-02c840459df1", "2e97406b-6f62-4ef5-b2be-6ea3c8a91b77", "prog-fse-001", "batch-2026-b", "usr-mentor-001", "NL-2026-215", "sirt", "b.tech", "Madhya Pradesh", "SHORT_DURATION", 60000, "ONLINE", "ONE_TIME", "ACTIVE", "ENROLLED"),
            ("ca38fa20-7346-4a57-a386-86590ca7860b", "d3101e89-3167-409d-b81b-d2eeafa1d17a", "prog-fse-001", "batch-2026-b", "usr-mentor-001", "NL-2026-619", "sirt", "b.tech", "Madhya Pradesh", "SHORT_DURATION", 60000, "ONLINE", "ONE_TIME", "ACTIVE", "ENROLLED"),
            ("62a0058f-b93f-4b84-8cb1-40c8f3956a77", "e002ea4c-773e-41b2-98ab-ed19aec10645", "prog-fse-001", "batch-2026-a", "usr-mentor-001", "NL-2026-291", "sirt", "b.tech", "Madhya Pradesh", "TECH_MASTER", 60000, "ONLINE", "ONE_TIME", "ACTIVE", "ENROLLED"),
            ("ad1205a8-28f8-4067-85ca-ea94a1d582a3", "8930804b-92b4-476b-80f4-074e66f99c32", "prog-fse-001", "batch-2026-a", "usr-mentor-001", "NL-2026-748", "sirt", "B.Tech Computer Science", "Madhya Pradesh", "TECH_MASTER", 60000, "ONLINE", "ONE_TIME", "ACTIVE", "NOT_ENROLLED"),
        ]

        for sid, uid, pid, bid, mid, roll, col, qual, dom, btype, fees, pmode, itype, stat, fstat in students_seed:
            st = db.query(Student).filter(Student.id == sid).first()
            if not st:
                st = db.query(Student).filter(Student.roll_number == roll).first()
            if not st:
                st = Student(
                    id=sid,
                    user_id=uid,
                    program_id=pid,
                    batch_id=bid,
                    mentor_id=mid,
                    roll_number=roll,
                    college_name=col,
                    qualification=qual,
                    domicile=dom,
                    batch_type=btype,
                    total_fees=fees,
                    payment_mode=pmode,
                    installment_type=itype,
                    start_date=date(2026, 2, 1),
                    end_date=date(2026, 8, 1),
                    enrollment_status=stat,
                    face_enrollment_status=fstat
                )
                db.add(st)

        # 6. Consents & Face Templates for enrolled students
        enrolled_templates = [
            ("fct-std-001", "usr-student-001", "std-001", "cns-std-001", "usr-admin-001", 0.985, 0.95),
            ("8a152263-634c-4582-8a6f-793962166e30", "usr-student-002", "std-002", "cns-std-002", "usr-hr-001", 0.985, 0.96),
            ("be0a4c4a-98fd-4e2d-b207-07b897b7e6d8", "9fb15684-3b76-4839-9aa8-d7490e01724a", "464b0a6b-743e-4bef-8322-9d0d725346b3", "cns-trisha", "usr-hr-001", 0.985, 0.96),
            ("339afee8-8551-4daf-aa12-82e414f6e05d", "6325b7ba-da05-4284-99dc-6748b93673a5", "12d6d4c6-a879-4dc2-8237-debb6f5e6f62", "cns-vikrant", "usr-hr-001", 0.985, 0.96),
            ("6a2b66df-ec8c-4cb4-8c6a-b07c06534dfe", "2e97406b-6f62-4ef5-b2be-6ea3c8a91b77", "243eb9f3-f76e-42c3-87b2-02c840459df1", "cns-divyam", "usr-hr-001", 0.7875, 0.9291),
            ("6ec75c53-466c-4539-bb7e-3ea34c266885", "d3101e89-3167-409d-b81b-d2eeafa1d17a", "ca38fa20-7346-4a57-a386-86590ca7860b", "cns-abc", "usr-hr-001", 0.7864, 0.7719),
            ("0875d534-d9f5-4bcd-9ace-911ddb1c43e8", "e002ea4c-773e-41b2-98ab-ed19aec10645", "62a0058f-b93f-4b84-8cb1-40c8f3956a77", "cns-vartika", "usr-hr-001", 0.7875, 0.9691),
        ]

        for fid, uid, sid, cid, enrolled_by, conf, qual in enrolled_templates:
            cns = db.query(Consent).filter(Consent.student_id == sid).first()
            if not cns:
                cns = Consent(
                    id=cid,
                    user_id=uid,
                    student_id=sid,
                    consent_type="FACIAL_BIOMETRIC_ATTENDANCE",
                    consent_version="v1.0",
                    is_granted=True,
                    ip_address="127.0.0.1"
                )
                db.add(cns)

            fct = db.query(FaceTemplate).filter(FaceTemplate.student_id == sid).first()
            if not fct:
                h = hashlib.sha256(f"{sid}-baseline".encode("utf-8")).digest()
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
                    id=fid,
                    user_id=uid,
                    student_id=sid,
                    embedding_reference=ref_json,
                    confidence_score=conf,
                    quality_score=qual,
                    enrolled_by=enrolled_by,
                    consent_id=cid
                )
                db.add(fct)

        db.commit()
        logger.info("Baseline seed data initialized successfully.")
    except Exception as e:
        db.rollback()
        logger.warning(f"Baseline seed initialization note: {e}")
