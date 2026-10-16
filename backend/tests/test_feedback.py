import pytest
from datetime import date
from tests.conftest import TestingSessionLocal
from app.models.all_models import Student, Batch, Program

MENTOR1_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-men-001"}
MENTOR2_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-men-002"}
STUDENT1_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-student-001"}
STUDENT2_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-student-002"}
HR_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-hr-001"}

@pytest.fixture(autouse=True)
def seed_feedback_test_data():
    db = TestingSessionLocal()
    prog = Program(
        id="prog-fb-01",
        title="Full Stack Traineeship",
        code="FS-2026",
        duration_weeks=12,
        is_active=True,
        created_by="usr-hr-001"
    )
    db.add(prog)
    db.commit()

    batch1 = Batch(
        id="batch-fb-01",
        program_id="prog-fb-01",
        name="Batch Alpha",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 6, 1),
        mentor_id="usr-men-001",
        status="ACTIVE"
    )
    batch2 = Batch(
        id="batch-fb-02",
        program_id="prog-fb-01",
        name="Batch Beta",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 6, 1),
        mentor_id="usr-men-002",
        status="ACTIVE"
    )
    db.add_all([batch1, batch2])
    db.commit()

    s1 = Student(
        id="std-001",
        user_id="usr-student-001",
        program_id="prog-fb-01",
        batch_id="batch-fb-02",
        mentor_id="usr-men-002",
        roll_number="NL-2026-001",
        enrollment_status="ACTIVE"
    )
    s2 = Student(
        id="std-002",
        user_id="usr-student-002",
        program_id="prog-fb-01",
        batch_id="batch-fb-01",
        mentor_id="usr-men-001",
        roll_number="NL-2026-002",
        enrollment_status="ACTIVE"
    )
    db.add_all([s1, s2])
    db.commit()
    db.close()


def test_submit_valid_mentor_feedback(client):
    payload = {
        "student_id": "std-002",
        "technical_skills": 5,
        "task_performance": 4,
        "communication": 5,
        "punctuality_professionalism": 4,
        "learning_attitude": 5,
        "comment": "Outstanding technical performance and proactive attitude in sprint discussions."
    }
    response = client.post("/api/v1/feedbacks", json=payload, headers=MENTOR1_HEADERS)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["student_id"] == "std-002"
    assert data["mentor_id"] == "usr-men-001"
    assert data["average_rating"] == 4.6
    assert data["technical_skills"] == 5
    assert "Outstanding technical performance" in data["comment"]


def test_mentor_cannot_submit_feedback_for_unassigned_student(client):
    # Mentor 1 is NOT assigned to Student 1 (who belongs to Mentor 2 / Batch Beta)
    payload = {
        "student_id": "std-001",
        "technical_skills": 4,
        "task_performance": 4,
        "communication": 4,
        "punctuality_professionalism": 4,
        "learning_attitude": 4,
        "comment": "Attempting unassigned feedback."
    }
    response = client.post("/api/v1/feedbacks", json=payload, headers=MENTOR1_HEADERS)
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


def test_invalid_rating_bounds_rejected(client):
    # Rating greater than 5
    payload = {
        "student_id": "std-002",
        "technical_skills": 6,
        "task_performance": 4,
        "communication": 5,
        "punctuality_professionalism": 4,
        "learning_attitude": 5,
        "comment": "Good progress."
    }
    response = client.post("/api/v1/feedbacks", json=payload, headers=MENTOR1_HEADERS)
    assert response.status_code == 422

    # Rating less than 1
    payload["technical_skills"] = 0
    response = client.post("/api/v1/feedbacks", json=payload, headers=MENTOR1_HEADERS)
    assert response.status_code == 422


def test_empty_comment_rejected(client):
    payload = {
        "student_id": "std-002",
        "technical_skills": 4,
        "task_performance": 4,
        "communication": 4,
        "punctuality_professionalism": 4,
        "learning_attitude": 4,
        "comment": "   "
    }
    response = client.post("/api/v1/feedbacks", json=payload, headers=MENTOR1_HEADERS)
    assert response.status_code == 422


def test_student_can_only_view_own_feedback(client):
    # Submit feedback for std-002
    payload = {
        "student_id": "std-002",
        "technical_skills": 5,
        "task_performance": 5,
        "communication": 5,
        "punctuality_professionalism": 5,
        "learning_attitude": 5,
        "comment": "Flawless execution on capstone."
    }
    client.post("/api/v1/feedbacks", json=payload, headers=MENTOR1_HEADERS)

    # Student 2 requests their feedback
    resp = client.get("/api/v1/feedbacks", headers=STUDENT2_HEADERS)
    assert resp.status_code == 200
    feedbacks = resp.json()
    assert len(feedbacks) >= 1
    for fb in feedbacks:
        assert fb["student_id"] == "std-002"

    # Student 2 attempts to query feedback for std-001 -> 403 Forbidden
    cross_resp = client.get("/api/v1/feedbacks/student/std-001", headers=STUDENT2_HEADERS)
    assert cross_resp.status_code == 403
    assert "Forbidden" in cross_resp.json()["detail"]


def test_hr_can_view_all_feedbacks(client):
    resp = client.get("/api/v1/feedbacks", headers=HR_HEADERS)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
