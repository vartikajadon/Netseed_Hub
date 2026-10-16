import sys
import os
from datetime import datetime, date, timedelta
sys.path.append('backend')

from app.database.session import SessionLocal
from app.models.all_models import (
    Program, Batch, Student, User, Task, TaskSubmission, Geofence
)

def update_app_data():
    db = SessionLocal()
    try:
        print("Updating application data according to recent changes...")

        # 1. Verify Geofence
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
            db.flush()

        # 2. Mentor
        mentor = db.query(User).filter(User.role == "MENTOR").first()
        mentor_id = mentor.id if mentor else "usr-mentor-001"

        # 3. Programs (Exactly 3)
        programs_dict = {
            "prog-fse-001": {
                "title": "Full Stack Development",
                "code": "FSD-2026",
                "description": "Comprehensive Full Stack Development Curriculum (React, TypeScript, Node.js, Python, FastAPI, PostgreSQL, Docker, Git)",
                "skills": "React, TypeScript, Python, FastAPI, PostgreSQL, Docker"
            },
            "df82531e-7a16-4313-86c5-9f927c00e260": {
                "title": "AI/ML",
                "code": "AIML-2026",
                "description": "Advanced Artificial Intelligence & Machine Learning Track (Python, PyTorch, Scikit-Learn, LLMs, NLP, Computer Vision)",
                "skills": "Python, PyTorch, Scikit-Learn, Deep Learning, NLP, LLMs"
            },
            "627c65ad-437e-483e-85ac-732f6ae48854": {
                "title": "Business Analyst",
                "code": "BA-2026",
                "description": "Business Analytics & Data-Driven Decision Making (SQL, Power BI, Advanced Excel, Data Modeling)",
                "skills": "SQL, Power BI, Excel, Tableau, Data Modeling, Business Intelligence"
            }
        }

        for pid, pdata in programs_dict.items():
            p = db.query(Program).filter(Program.id == pid).first()
            if not p:
                p = Program(
                    id=pid,
                    title=pdata["title"],
                    code=pdata["code"],
                    description=pdata["description"],
                    skills=pdata["skills"],
                    duration_weeks=12,
                    is_active=True,
                    created_by="usr-hr-001"
                )
                db.add(p)
            else:
                p.title = pdata["title"]
                p.code = pdata["code"]
                p.description = pdata["description"]
                p.skills = pdata["skills"]
                p.is_active = True
        db.flush()

        # 4. Batches for each Program
        # Tech Masters: 6m + 6m (12m total)
        # Short Duration: 3m + 3m (6m total)
        # Internship: 1m + 3m (4m total)
        batches_def = [
            # Full Stack Development Batches
            {
                "id": "batch-2026-a",
                "program_id": "prog-fse-001",
                "name": "Batch 2026-A (Tech Masters)",
                "batch_type": "TECH_MASTER",
                "training_duration_months": 6,
                "internship_duration_months": 6,
                "start_date": date(2026, 1, 15),
                "end_date": date(2027, 1, 15)
            },
            {
                "id": "batch-2026-b",
                "program_id": "prog-fse-001",
                "name": "Batch 2026-B1 (Short Duration Course)",
                "batch_type": "SHORT_DURATION",
                "training_duration_months": 3,
                "internship_duration_months": 3,
                "start_date": date(2026, 2, 1),
                "end_date": date(2026, 8, 1)
            },
            {
                "id": "batch-2026-b2",
                "program_id": "prog-fse-001",
                "name": "Batch 2026-B2 (Short Duration Course)",
                "batch_type": "SHORT_DURATION",
                "training_duration_months": 3,
                "internship_duration_months": 3,
                "start_date": date(2026, 7, 15),
                "end_date": date(2027, 1, 15)
            },
            {
                "id": "batch-2026-c",
                "program_id": "prog-fse-001",
                "name": "Batch 2026-C (Internship)",
                "batch_type": "INTERNSHIP",
                "training_duration_months": 1,
                "internship_duration_months": 3,
                "start_date": date(2026, 3, 1),
                "end_date": date(2026, 7, 1)
            },
            # AI/ML Batches
            {
                "id": "batch-2026-aiml-a",
                "program_id": "df82531e-7a16-4313-86c5-9f927c00e260",
                "name": "Batch 2026-A (Tech Masters)",
                "batch_type": "TECH_MASTER",
                "training_duration_months": 6,
                "internship_duration_months": 6,
                "start_date": date(2026, 1, 15),
                "end_date": date(2027, 1, 15)
            },
            {
                "id": "batch-2026-aiml-b",
                "program_id": "df82531e-7a16-4313-86c5-9f927c00e260",
                "name": "Batch 2026-B1 (Short Duration Course)",
                "batch_type": "SHORT_DURATION",
                "training_duration_months": 3,
                "internship_duration_months": 3,
                "start_date": date(2026, 2, 1),
                "end_date": date(2026, 8, 1)
            },
            {
                "id": "batch-2026-aiml-c",
                "program_id": "df82531e-7a16-4313-86c5-9f927c00e260",
                "name": "Batch 2026-C (Internship)",
                "batch_type": "INTERNSHIP",
                "training_duration_months": 1,
                "internship_duration_months": 3,
                "start_date": date(2026, 3, 1),
                "end_date": date(2026, 7, 1)
            },
            # Business Analyst Batches
            {
                "id": "batch-2026-ba-a",
                "program_id": "627c65ad-437e-483e-85ac-732f6ae48854",
                "name": "Batch 2026-A (Tech Masters)",
                "batch_type": "TECH_MASTER",
                "training_duration_months": 6,
                "internship_duration_months": 6,
                "start_date": date(2026, 1, 15),
                "end_date": date(2027, 1, 15)
            },
            {
                "id": "batch-2026-ba-b",
                "program_id": "627c65ad-437e-483e-85ac-732f6ae48854",
                "name": "Batch 2026-B1 (Short Duration Course)",
                "batch_type": "SHORT_DURATION",
                "training_duration_months": 3,
                "internship_duration_months": 3,
                "start_date": date(2026, 2, 1),
                "end_date": date(2026, 8, 1)
            },
            {
                "id": "batch-2026-ba-c",
                "program_id": "627c65ad-437e-483e-85ac-732f6ae48854",
                "name": "Batch 2026-C (Internship)",
                "batch_type": "INTERNSHIP",
                "training_duration_months": 1,
                "internship_duration_months": 3,
                "start_date": date(2026, 3, 1),
                "end_date": date(2026, 7, 1)
            },
        ]

        for b_def in batches_def:
            b = db.query(Batch).filter(Batch.id == b_def["id"]).first()
            if not b:
                b = Batch(
                    id=b_def["id"],
                    program_id=b_def["program_id"],
                    name=b_def["name"],
                    batch_type=b_def["batch_type"],
                    training_duration_months=b_def["training_duration_months"],
                    internship_duration_months=b_def["internship_duration_months"],
                    start_date=b_def["start_date"],
                    end_date=b_def["end_date"],
                    geofence_id=geo.id,
                    mentor_id=mentor_id,
                    status="ACTIVE"
                )
                db.add(b)
            else:
                b.program_id = b_def["program_id"]
                b.name = b_def["name"]
                b.batch_type = b_def["batch_type"]
                b.training_duration_months = b_def["training_duration_months"]
                b.internship_duration_months = b_def["internship_duration_months"]
                b.start_date = b_def["start_date"]
                b.end_date = b_def["end_date"]
                b.status = "ACTIVE"
        db.flush()

        # 5. Distribute Students across Programs and Batches
        # Map students by email
        student_assignments = {
            # Full Stack Development (FSD)
            "student2@netlink.org": ("prog-fse-001", "batch-2026-a", "TECH_MASTER"),
            "vartika@gmail.com": ("prog-fse-001", "batch-2026-a", "TECH_MASTER"),
            "student1@netlink.org": ("prog-fse-001", "batch-2026-b", "SHORT_DURATION"),
            "divyam@gmail.com": ("prog-fse-001", "batch-2026-b2", "SHORT_DURATION"),
            "vikrant@gmail.com": ("prog-fse-001", "batch-2026-c", "INTERNSHIP"),

            # AI/ML
            "ishan@gmail.com": ("df82531e-7a16-4313-86c5-9f927c00e260", "batch-2026-aiml-a", "TECH_MASTER"),
            "neha@gmail.com": ("df82531e-7a16-4313-86c5-9f927c00e260", "batch-2026-aiml-b", "SHORT_DURATION"),
            "anil9@gmail.com": ("df82531e-7a16-4313-86c5-9f927c00e260", "batch-2026-aiml-b", "SHORT_DURATION"),
            "trisha@gmail.com": ("df82531e-7a16-4313-86c5-9f927c00e260", "batch-2026-aiml-c", "INTERNSHIP"),

            # Business Analyst (BA)
            "suneeta@gmail.com": ("627c65ad-437e-483e-85ac-732f6ae48854", "batch-2026-ba-a", "TECH_MASTER"),
            "abc@gmail.com": ("627c65ad-437e-483e-85ac-732f6ae48854", "batch-2026-ba-b", "SHORT_DURATION"),
            "vb@gmail.com": ("627c65ad-437e-483e-85ac-732f6ae48854", "batch-2026-ba-b", "SHORT_DURATION"),
            "ekta@gmail.comn": ("627c65ad-437e-483e-85ac-732f6ae48854", "batch-2026-ba-c", "INTERNSHIP"),
        }

        all_students = db.query(Student).all()
        for stu in all_students:
            user = db.query(User).filter(User.id == stu.user_id).first()
            if not user:
                continue
            email = user.email.lower()
            if email in student_assignments:
                prog_id, bat_id, b_type = student_assignments[email]
                stu.program_id = prog_id
                stu.batch_id = bat_id
                stu.batch_type = b_type
                stu.enrollment_status = "ACTIVE"
            elif not stu.batch_id:
                stu.program_id = "prog-fse-001"
                stu.batch_id = "batch-2026-a"
                stu.batch_type = "TECH_MASTER"
        db.flush()

        # 6. Tasks for all batches
        tasks_seed = [
            # Full Stack Development Tasks
            {
                "title": "Full Stack Authentication Pipeline & JWT Cookies",
                "description": "Implement robust server-side JWT authentication with HTTP-only cookie rotation, CSRF token validation, and RBAC middleware.",
                "batch_id": "batch-2026-a",
                "due_days": 5,
                "max_marks": 100
            },
            {
                "title": "Scalable Microservices with FastAPI & Docker Containerization",
                "description": "Containerize backend services with Docker Compose, configure automated health check endpoints, and implement redis caching.",
                "batch_id": "batch-2026-a",
                "due_days": 12,
                "max_marks": 100
            },
            {
                "title": "React 18 Component Architecture with Tailwind & Vite",
                "description": "Build reusable UI components with dark mode support, accessible modal dialogs, and optimistic UI updates.",
                "batch_id": "batch-2026-b",
                "due_days": 7,
                "max_marks": 100
            },
            {
                "title": "API Gateway & Rate Limiting Middleware Implementation",
                "description": "Configure token-bucket rate limiter, CORS origin security headers, and standardized RFC-7807 problem details.",
                "batch_id": "batch-2026-b2",
                "due_days": 8,
                "max_marks": 100
            },
            {
                "title": "Internship Capstone: Production Deployment & CI/CD Pipeline",
                "description": "Implement automated GitHub Actions CI/CD pipeline with Pytest unit testing, lint verification, and zero-downtime deployment.",
                "batch_id": "batch-2026-c",
                "due_days": 14,
                "max_marks": 100
            },

            # AI/ML Tasks
            {
                "title": "Deep Learning & Computer Vision: Transfer Learning with PyTorch",
                "description": "Train a ResNet/EfficientNet backbone for image classification with data augmentation, learning rate scheduling, and confusion matrix evaluation.",
                "batch_id": "batch-2026-aiml-a",
                "due_days": 6,
                "max_marks": 100
            },
            {
                "title": "Predictive Customer Churn Model with Scikit-Learn & Feature Engineering",
                "description": "Perform exploratory data analysis (EDA), handle class imbalance with SMOTE, and optimize XGBoost hyperparameters via Optuna.",
                "batch_id": "batch-2026-aiml-b",
                "due_days": 8,
                "max_marks": 100
            },
            {
                "title": "LLM Fine-Tuning & RAG Pipeline with Vector Embeddings",
                "description": "Construct an enterprise retrieval-augmented generation (RAG) system using FAISS vector indexing, LangChain, and prompt guardrails.",
                "batch_id": "batch-2026-aiml-c",
                "due_days": 15,
                "max_marks": 100
            },

            # Business Analyst Tasks
            {
                "title": "Enterprise Data Warehousing & Star Schema Design in PostgreSQL",
                "description": "Model fact and dimension tables for sales analytics, implement SCD Type 2 dimension historical tracking, and write indexed analytical queries.",
                "batch_id": "batch-2026-ba-a",
                "due_days": 7,
                "max_marks": 100
            },
            {
                "title": "Executive Power BI Dashboard: Multi-Channel Revenue & Cohort Metrics",
                "description": "Create DAX measures for month-over-month (MoM) growth, customer lifetime value (CLV), and interactive drill-down reports.",
                "batch_id": "batch-2026-ba-b",
                "due_days": 9,
                "max_marks": 100
            },
            {
                "title": "Financial Forecasting & Business KPI Model with Advanced Excel & SQL",
                "description": "Build financial forecasting workbook with sensitivity analysis, break-even simulation, and SQL queries extracting customer acquisition cost (CAC).",
                "batch_id": "batch-2026-ba-c",
                "due_days": 14,
                "max_marks": 100
            },
        ]

        now = datetime.utcnow()
        for t_def in tasks_seed:
            existing = db.query(Task).filter(
                Task.title == t_def["title"],
                Task.batch_id == t_def["batch_id"]
            ).first()
            if not existing:
                task_obj = Task(
                    title=t_def["title"],
                    description=t_def["description"],
                    batch_id=t_def["batch_id"],
                    mentor_id=mentor_id,
                    due_date=now + timedelta(days=t_def["due_days"]),
                    max_marks=t_def["max_marks"],
                    assign_to_all=True
                )
                db.add(task_obj)
        db.flush()

        # 7. Add sample evaluated submissions for realistic mentor/student experience
        # Student 2 (Jane Smith) submission for FSD Task 1
        t_fsd_1 = db.query(Task).filter(Task.batch_id == "batch-2026-a").first()
        s_jane = db.query(Student).join(User, Student.user_id == User.id).filter(User.email == "student2@netlink.org").first()
        if t_fsd_1 and s_jane:
            sub = db.query(TaskSubmission).filter(
                TaskSubmission.task_id == t_fsd_1.id,
                TaskSubmission.student_id == s_jane.id
            ).first()
            if not sub:
                sub = TaskSubmission(
                    task_id=t_fsd_1.id,
                    student_id=s_jane.id,
                    submission_type="CODE_LINK",
                    code_link="https://github.com/netlink-trainee/jwt-pipeline-impl",
                    text_output="Implemented JWT authentication with refresh token rotation and automated Pytest test suite covering edge cases.",
                    status="EVALUATED",
                    marks=94.5,
                    max_marks=100,
                    feedback="Outstanding architecture. Clear separation of token generation from route handlers, and unit test coverage is thorough.",
                    evaluated_by=mentor_id,
                    evaluated_at=now - timedelta(hours=3),
                    ack_sent_to_student=True,
                    ack_sent_to_hr=True,
                    ack_message="Excellent work Jane! Score: 94.5/100."
                )
                db.add(sub)

        # Student 1 (John Doe) submission for FSD Task 3 (batch-2026-b)
        t_fsd_b = db.query(Task).filter(Task.batch_id == "batch-2026-b").first()
        s_john = db.query(Student).join(User, Student.user_id == User.id).filter(User.email == "student1@netlink.org").first()
        if t_fsd_b and s_john:
            sub2 = db.query(TaskSubmission).filter(
                TaskSubmission.task_id == t_fsd_b.id,
                TaskSubmission.student_id == s_john.id
            ).first()
            if not sub2:
                sub2 = TaskSubmission(
                    task_id=t_fsd_b.id,
                    student_id=s_john.id,
                    submission_type="CODE_LINK",
                    code_link="https://github.com/johndoe-netlink/react18-tailwind-components",
                    text_output="Created modular component library with Tailwind, full dark mode palette, and accessible keyboard traps.",
                    status="PENDING_EVALUATION",
                    max_marks=100,
                    ack_sent_to_student=False,
                    ack_sent_to_hr=False
                )
                db.add(sub2)

        # Ishan submission for AI/ML Task
        t_aiml = db.query(Task).filter(Task.batch_id == "batch-2026-aiml-a").first()
        s_ishan = db.query(Student).join(User, Student.user_id == User.id).filter(User.email == "ishan@gmail.com").first()
        if t_aiml and s_ishan:
            sub3 = db.query(TaskSubmission).filter(
                TaskSubmission.task_id == t_aiml.id,
                TaskSubmission.student_id == s_ishan.id
            ).first()
            if not sub3:
                sub3 = TaskSubmission(
                    task_id=t_aiml.id,
                    student_id=s_ishan.id,
                    submission_type="CODE_LINK",
                    code_link="https://github.com/ishan-ml/pytorch-transfer-learning",
                    text_output="Fine-tuned ResNet-50 achieving 96.2% validation accuracy on CIFAR-100 dataset.",
                    status="EVALUATED",
                    marks=96.0,
                    max_marks=100,
                    feedback="Exceptional work on the learning rate warmup and confusion matrix visualizations.",
                    evaluated_by=mentor_id,
                    evaluated_at=now - timedelta(hours=5),
                    ack_sent_to_student=True,
                    ack_sent_to_hr=True,
                    ack_message="Top score Ishan! 96/100."
                )
                db.add(sub3)

        # Suneeta submission for Business Analyst Task
        t_ba = db.query(Task).filter(Task.batch_id == "batch-2026-ba-a").first()
        s_suneeta = db.query(Student).join(User, Student.user_id == User.id).filter(User.email == "suneeta@gmail.com").first()
        if t_ba and s_suneeta:
            sub4 = db.query(TaskSubmission).filter(
                TaskSubmission.task_id == t_ba.id,
                TaskSubmission.student_id == s_suneeta.id
            ).first()
            if not sub4:
                sub4 = TaskSubmission(
                    task_id=t_ba.id,
                    student_id=s_suneeta.id,
                    submission_type="CODE_LINK",
                    code_link="https://github.com/suneeta-ba/enterprise-dw-star-schema",
                    text_output="Designed and tested 4 fact tables and 9 dimension tables with SCD Type 2 tracking in PostgreSQL.",
                    status="EVALUATED",
                    marks=91.0,
                    max_marks=100,
                    feedback="Solid dimensional modeling. Well structured surrogate keys and historical date partitioning.",
                    evaluated_by=mentor_id,
                    evaluated_at=now - timedelta(hours=8),
                    ack_sent_to_student=True,
                    ack_sent_to_hr=True,
                    ack_message="Great work Suneeta! Score: 91/100."
                )
                db.add(sub4)

        db.commit()
        print("Application data updated successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error updating app data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    update_app_data()
