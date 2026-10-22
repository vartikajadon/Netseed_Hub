from datetime import datetime, timedelta
import pytest
from app.models.all_models import User, Student, Batch, Program

def test_student_passout_year_and_cv_upload(client, db_session):
    student_user = User(
        id="usr-stu-cv-1",
        email="cvstudent@test.com",
        full_name="CV Student",
        role="STUDENT",
        is_active=True
    )
    db_session.add(student_user)
    db_session.commit()

    student = Student(
        user_id=student_user.id,
        roll_number="STU-CV-001",
        passout_year=2025,
    )
    db_session.add(student)
    db_session.commit()

    headers = {"Authorization": f"Bearer mock_jwt_token_{student_user.id}"}

    # 1. Fetch student profile - check passout_year
    res = client.get("/api/v1/students/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["passout_year"] == 2025

    # 2. Upload student CV
    cv_payload = {
        "cv_url": "data:application/pdf;base64,JVBERi0xLjQKJUZha2VQREY=",
        "cv_file_name": "My_Resume_2025.pdf"
    }
    res_cv = client.post("/api/v1/students/me/cv", json=cv_payload, headers=headers)
    assert res_cv.status_code == 200
    data = res_cv.json()
    assert data["cv_file_name"] == "My_Resume_2025.pdf"
    assert "data:application/pdf" in data["cv_url"]

    # 3. Verify in student profile
    res_updated = client.get("/api/v1/students/me", headers=headers)
    assert res_updated.status_code == 200
    assert res_updated.json()["cv_file_name"] == "My_Resume_2025.pdf"


def test_mentor_batch_and_student_projects_sync_to_scoresheet(client, db_session):
    mentor_user = User(
        id="usr-mentor-proj-1",
        email="mentor_proj@test.com",
        full_name="Project Mentor",
        role="MENTOR",
        is_active=True
    )
    student_user = User(
        id="usr-student-proj-1",
        email="student_proj@test.com",
        full_name="Capstone Student",
        role="STUDENT",
        is_active=True
    )
    db_session.add_all([mentor_user, student_user])
    db_session.commit()

    program = Program(
        title="Full Stack Software Engineering",
        code="FS-PROJ-01",
        duration_weeks=24
    )
    db_session.add(program)
    db_session.commit()

    batch = Batch(
        name="Cohort Lambda",
        program_id=program.id,
        mentor_id=mentor_user.id,
        start_date=datetime.utcnow().date(),
        end_date=(datetime.utcnow() + timedelta(days=180)).date(),
        status="ACTIVE"
    )
    db_session.add(batch)
    db_session.commit()

    student = Student(
        user_id=student_user.id,
        program_id=program.id,
        batch_id=batch.id,
        mentor_id=mentor_user.id,
        roll_number="STU-PRJ-001",
        passout_year=2024
    )
    db_session.add(student)
    db_session.commit()

    m_headers = {"Authorization": f"Bearer mock_jwt_token_{mentor_user.id}"}
    s_headers = {"Authorization": f"Bearer mock_jwt_token_{student_user.id}"}

    # 1. Mentor broadcasts project idea to batch
    assign_payload = {
        "project_title": "Enterprise Microservices Portal",
        "project_description": "Build high-throughput FastAPI service with React frontend",
        "overwrite_existing": False
    }
    assign_res = client.post(f"/api/v1/projects/batch/{batch.id}/assign", json=assign_payload, headers=m_headers)
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_count"] == 1

    # 2. Mentor views batch project status
    batch_res = client.get(f"/api/v1/projects/batch/{batch.id}", headers=m_headers)
    assert batch_res.status_code == 200
    batch_data = batch_res.json()
    assert batch_data["assigned_count"] == 1
    assert batch_data["students"][0]["project_title"] == "Enterprise Microservices Portal"
    assert batch_data["students"][0]["passout_year"] == 2024

    # 3. Mentor customizes individual project for student
    cust_res = client.put(
        f"/api/v1/projects/student/{student.id}",
        json={
            "project_title": "Custom Distributed Event Broker",
            "project_description": "Tailored for student's advanced backend focus"
        },
        headers=m_headers
    )
    assert cust_res.status_code == 200
    assert cust_res.json()["project_title"] == "Custom Distributed Event Broker"

    # 4. Student sees customized project on dashboard
    my_proj_res = client.get("/api/v1/projects/my-project", headers=s_headers)
    assert my_proj_res.status_code == 200
    assert my_proj_res.json()["project_title"] == "Custom Distributed Event Broker"

    # 5. Student submits their project URL
    submit_res = client.put(
        "/api/v1/projects/my-project/submit",
        json={"project_url": "https://github.com/capstone-student/distributed-event-broker"},
        headers=s_headers
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["project_url"] == "https://github.com/capstone-student/distributed-event-broker"

    # 6. Automatic sync: verify project URL is visible in Scoresheet matrix
    sheet_res = client.get(f"/api/v1/assessments/score-sheet/matrix?batch_id={batch.id}", headers=m_headers)
    assert sheet_res.status_code == 200
    sheet_data = sheet_res.json()
    assert len(sheet_data) == 1
    assert sheet_data[0]["project_url"] == "https://github.com/capstone-student/distributed-event-broker"
