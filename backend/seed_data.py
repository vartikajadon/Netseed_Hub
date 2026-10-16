import sys
import os
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session

# Add parent directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.database.session import Base, engine, SessionLocal
import app.models.all_models
from app.models.all_models import (
    User, Program, Batch, Geofence, Student, Device, Consent,
    FaceTemplate, AuditLog, Task, TaskSubmission
)

def run_seed():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        print("Seeding initial development data according to recent specifications...")

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
        else:
            geo.name = "Netlink Software Group America Inc., Bhopal Campus"
            geo.center_latitude = 23.11186100
            geo.center_longitude = 77.51574400
            geo.radius_meters = 100.00
            geo.address = "Mandideep Industrial Area, Bhopal, MP 462046"

        # 2. Core Users (@netlink.org)
        users_data = [
            ("usr-admin-001", "admin@netlink.org", "Abhishek Verma", "SUPER_ADMIN", "+15550000001"),
            ("usr-hr-001", "hr@netlink.org", "Prerna Verma", "HR", "+15550000002"),
            ("usr-mentor-001", "mentor@netlink.org", "Alex Rivera (Lead Mentor)", "MENTOR", "+15550000003"),
            ("usr-student-001", "student1@netlink.org", "John Doe", "STUDENT", "+15550000004"),
            ("usr-student-002", "student2@netlink.org", "Jane Smith", "STUDENT", "+15550000005"),
        ]

        # Clean up old .local users if present
        db.query(User).filter(User.email.like("%@netlink.local")).delete(synchronize_session=False)

        for uid, email, name, role, phone in users_data:
            u = db.query(User).filter(User.id == uid).first()
            if not u:
                u = User(id=uid, email=email, full_name=name, role=role, phone=phone, is_active=True)
                db.add(u)
            else:
                u.email = email
                u.full_name = name
                u.role = role

        # 3. Programs (Full Stack Development, AI/ML, Business Analyst)
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
            else:
                p.title = ptitle
                p.code = pcode
                p.description = pdesc
                p.skills = pskills
                p.is_active = True

        # 4. Batches (Smart Cohort Naming & Durations)
        # Tech Masters: 6m Training + 6m Internship (12 Months)
        # Short Duration Course: 3m Training + 3m Internship (6 Months)
        # Internship: 1m Training + 3m Internship (4 Months)
        batches_seed = [
            # Full Stack Development Batches
            ("batch-2026-a", "prog-fse-001", "Batch 2026-A (Tech Masters)", "TECH_MASTER", 6, 6, date(2026, 1, 15), date(2027, 1, 15)),
            ("batch-2026-b", "prog-fse-001", "Batch 2026-B1 (Short Duration Course)", "SHORT_DURATION", 3, 3, date(2026, 2, 1), date(2026, 8, 1)),
            ("batch-2026-b2", "prog-fse-001", "Batch 2026-B2 (Short Duration Course)", "SHORT_DURATION", 3, 3, date(2026, 7, 15), date(2027, 1, 15)),
            ("batch-2026-c", "prog-fse-001", "Batch 2026-C (Internship)", "INTERNSHIP", 1, 3, date(2026, 3, 1), date(2026, 7, 1)),

            # AI/ML Batches
            ("batch-2026-aiml-a", "df82531e-7a16-4313-86c5-9f927c00e260", "Batch 2026-A (Tech Masters)", "TECH_MASTER", 6, 6, date(2026, 1, 15), date(2027, 1, 15)),
            ("batch-2026-aiml-b", "df82531e-7a16-4313-86c5-9f927c00e260", "Batch 2026-B1 (Short Duration Course)", "SHORT_DURATION", 3, 3, date(2026, 2, 1), date(2026, 8, 1)),
            ("batch-2026-aiml-c", "df82531e-7a16-4313-86c5-9f927c00e260", "Batch 2026-C (Internship)", "INTERNSHIP", 1, 3, date(2026, 3, 1), date(2026, 7, 1)),

            # Business Analyst Batches
            ("batch-2026-ba-a", "627c65ad-437e-483e-85ac-732f6ae48854", "Batch 2026-A (Tech Masters)", "TECH_MASTER", 6, 6, date(2026, 1, 15), date(2027, 1, 15)),
            ("batch-2026-ba-b", "627c65ad-437e-483e-85ac-732f6ae48854", "Batch 2026-B1 (Short Duration Course)", "SHORT_DURATION", 3, 3, date(2026, 2, 1), date(2026, 8, 1)),
            ("batch-2026-ba-c", "627c65ad-437e-483e-85ac-732f6ae48854", "Batch 2026-C (Internship)", "INTERNSHIP", 1, 3, date(2026, 3, 1), date(2026, 7, 1)),
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
            else:
                b.program_id = b_pid
                b.name = b_name
                b.batch_type = b_type
                b.training_duration_months = t_dur
                b.internship_duration_months = i_dur
                b.start_date = s_date
                b.end_date = e_date
                b.status = "ACTIVE"

        # 5. Core Demo Students
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
        else:
            st1.program_id = "prog-fse-001"
            st1.batch_id = "batch-2026-b"
            st1.batch_type = "SHORT_DURATION"

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
        else:
            st2.program_id = "prog-fse-001"
            st2.batch_id = "batch-2026-a"
            st2.batch_type = "TECH_MASTER"

        # 6. Devices
        dev1 = db.query(Device).filter(Device.id == "dev-std-001").first()
        if not dev1:
            dev1 = Device(
                id="dev-std-001",
                user_id="usr-student-001",
                student_id="std-001",
                device_fingerprint="fp-macbook-pro-m2-john-doe",
                device_model="MacBook Pro 14 (2023)",
                os_version="macOS 14.4",
                status="APPROVED",
                approved_by="usr-hr-001"
            )
            db.add(dev1)

        dev2 = db.query(Device).filter(Device.id == "dev-std-002").first()
        if not dev2:
            dev2 = Device(
                id="dev-std-002",
                user_id="usr-student-002",
                student_id="std-002",
                device_fingerprint="fp-dell-xps15-jane-smith",
                device_model="Dell XPS 15 9530",
                os_version="Windows 11 23H2",
                status="PENDING"
            )
            db.add(dev2)

        # 7. Consent
        cns = db.query(Consent).filter(Consent.id == "cns-std-001").first()
        if not cns:
            cns = Consent(
                id="cns-std-001",
                user_id="usr-student-001",
                student_id="std-001",
                consent_type="FACIAL_BIOMETRIC_ATTENDANCE",
                consent_version="v1.0",
                is_granted=True,
                ip_address="192.168.1.50"
            )
            db.add(cns)

        # 8. Face Template
        fct = db.query(FaceTemplate).filter(FaceTemplate.id == "fct-std-001").first()
        if not fct:
            fct = FaceTemplate(
                id="fct-std-001",
                user_id="usr-student-001",
                student_id="std-001",
                embedding_reference="enc_vector_ref_mock_512d_hash_john_doe_99812",
                confidence_score=0.9850,
                quality_score=0.9600,
                enrolled_by="usr-hr-001",
                consent_id="cns-std-001"
            )
            db.add(fct)

        # 9. Audit Log
        aud = db.query(AuditLog).filter(AuditLog.id == "aud-001").first()
        if not aud:
            aud = AuditLog(
                id="aud-001",
                actor_id="usr-admin-001",
                action="INITIAL_SYSTEM_SEED",
                entity="SYSTEM",
                entity_id="sys-001",
                new_values='{"status": "Initialized seed development environment"}',
                ip_address="127.0.0.1"
            )
            db.add(aud)

        # 10. Mentor Assigned Tasks & Submissions
        now = datetime.now()
        tasks_seed = [
            ("Full Stack Authentication Pipeline & JWT Cookies", "Implement robust server-side JWT authentication with HTTP-only cookie rotation, CSRF token validation, and RBAC middleware.", "batch-2026-a", 5, 100),
            ("Scalable Microservices with FastAPI & Docker Containerization", "Containerize backend services with Docker Compose, configure automated health check endpoints, and implement redis caching.", "batch-2026-a", 12, 100),
            ("React 18 Component Architecture with Tailwind & Vite", "Build reusable UI components with dark mode support, accessible modal dialogs, and optimistic UI updates.", "batch-2026-b", 7, 100),
            ("API Gateway & Rate Limiting Middleware Implementation", "Configure token-bucket rate limiter, CORS origin security headers, and standardized RFC-7807 problem details.", "batch-2026-b2", 8, 100),
            ("Internship Capstone: Production Deployment & CI/CD Pipeline", "Implement automated GitHub Actions CI/CD pipeline with Pytest unit testing, lint verification, and zero-downtime deployment.", "batch-2026-c", 14, 100),
            ("Deep Learning & Computer Vision: Transfer Learning with PyTorch", "Train a ResNet/EfficientNet backbone for image classification with data augmentation, learning rate scheduling, and confusion matrix evaluation.", "batch-2026-aiml-a", 6, 100),
            ("Predictive Customer Churn Model with Scikit-Learn & Feature Engineering", "Perform exploratory data analysis (EDA), handle class imbalance with SMOTE, and optimize XGBoost hyperparameters via Optuna.", "batch-2026-aiml-b", 8, 100),
            ("LLM Fine-Tuning & RAG Pipeline with Vector Embeddings", "Construct an enterprise retrieval-augmented generation (RAG) system using FAISS vector indexing, LangChain, and prompt guardrails.", "batch-2026-aiml-c", 15, 100),
            ("Enterprise Data Warehousing & Star Schema Design in PostgreSQL", "Model fact and dimension tables for sales analytics, implement SCD Type 2 dimension historical tracking, and write indexed analytical queries.", "batch-2026-ba-a", 7, 100),
            ("Executive Power BI Dashboard: Multi-Channel Revenue & Cohort Metrics", "Create DAX measures for month-over-month (MoM) growth, customer lifetime value (CLV), and interactive drill-down reports.", "batch-2026-ba-b", 9, 100),
            ("Financial Forecasting & Business KPI Model with Advanced Excel & SQL", "Build financial forecasting workbook with sensitivity analysis, break-even simulation, and SQL queries extracting customer acquisition cost (CAC).", "batch-2026-ba-c", 14, 100),
        ]

        for title, desc, bid, due_days, max_marks in tasks_seed:
            t = db.query(Task).filter(Task.title == title, Task.batch_id == bid).first()
            if not t:
                t = Task(
                    title=title,
                    description=desc,
                    batch_id=bid,
                    mentor_id="usr-mentor-001",
                    due_date=now + timedelta(days=due_days),
                    max_marks=max_marks,
                    assign_to_all=True
                )
                db.add(t)

        db.commit()
        print("Database seed completed successfully with updated program, batch, and task data!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
