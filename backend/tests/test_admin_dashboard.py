import pytest
from datetime import datetime, date, timedelta
from app.models.all_models import (
    User, Student, Program, Batch, Geofence, Device, AttendanceDailyRecord, AttendanceEvent, AuditLog
)

ADMIN_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-admin-001"}
HR_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-hr-001"}
MENTOR_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-men-001"}
STUDENT_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-student-001"}


def test_super_admin_can_access_dashboard_summary(client):
    """SUPER_ADMIN can access executive summary."""
    response = client.get("/api/v1/admin/dashboard/summary", headers=ADMIN_HEADERS)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "users" in data
    assert "students" in data
    assert "programs" in data
    assert "batches" in data
    assert "mentors" in data
    assert "today_attendance" in data
    assert "face_enrollment" in data
    assert "career_readiness" in data
    assert "security_alerts" in data
    assert data["users"]["total"] >= 1


def test_unauthenticated_cannot_access_dashboard(client):
    """Unauthenticated requests must be rejected with 401."""
    response = client.get("/api/v1/admin/dashboard/summary")
    assert response.status_code == 401


def test_student_cannot_access_dashboard(client):
    """Students must receive 403 Forbidden."""
    endpoints = [
        "/api/v1/admin/dashboard/summary",
        "/api/v1/admin/dashboard/students",
        "/api/v1/admin/dashboard/programs",
        "/api/v1/admin/dashboard/attendance",
        "/api/v1/admin/dashboard/tasks",
        "/api/v1/admin/dashboard/career-readiness",
        "/api/v1/admin/dashboard/outcomes",
        "/api/v1/admin/dashboard/security-alerts",
        "/api/v1/admin/dashboard/recent-activity",
    ]
    for ep in endpoints:
        res = client.get(ep, headers=STUDENT_HEADERS)
        assert res.status_code == 403, f"Expected 403 for {ep}, got {res.status_code}"


def test_mentor_cannot_access_dashboard(client):
    """Mentors must receive 403 Forbidden."""
    res = client.get("/api/v1/admin/dashboard/summary", headers=MENTOR_HEADERS)
    assert res.status_code == 403


def test_hr_cannot_access_super_admin_dashboard(client):
    """HR role must receive 403 Forbidden on Super Admin endpoints."""
    res = client.get("/api/v1/admin/dashboard/summary", headers=HR_HEADERS)
    assert res.status_code == 403


def test_dashboard_students_endpoint(client, db_session):
    """Returns real students list with readiness score and filters."""
    response = client.get("/api/v1/admin/dashboard/students", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "distribution" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    if data["items"]:
        s = data["items"][0]
        assert "roll_number" in s
        assert "career_readiness_score" in s
        assert "readiness_band" in s
        # Ensure no biometric vectors leaked
        assert "embedding_reference" not in s


def test_dashboard_programs_endpoint(client):
    """Returns program & batch hierarchy."""
    response = client.get("/api/v1/admin/dashboard/programs", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "total_programs" in data
    assert "programs" in data
    assert isinstance(data["programs"], list)


def test_dashboard_attendance_endpoint(client):
    """Returns attendance overview matching backend business rules."""
    response = client.get("/api/v1/admin/dashboard/attendance", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "today" in data
    assert "attendance_threshold" in data
    assert data["attendance_threshold"] == 75.0
    assert "students_below_threshold" in data
    assert "pending_regularizations_count" in data
    assert "daily_trends" in data
    assert "batch_breakdowns" in data


def test_dashboard_tasks_and_skills_endpoints(client):
    """Returns tasks progress and skill tier distribution (Beginner, Intermediate, Proficient, Expert)."""
    response = client.get("/api/v1/admin/dashboard/tasks", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "tasks_assigned" in data
    assert "tasks_completed" in data
    assert "skill_distribution" in data
    sd = data["skill_distribution"]
    assert "beginner" in sd
    assert "intermediate" in sd
    assert "proficient" in sd
    assert "expert" in sd
    assert "top_skills" in data


def test_dashboard_career_readiness_formula(client):
    """Career readiness contains correct bands, weights, and decision-support disclaimer."""
    response = client.get("/api/v1/admin/dashboard/career-readiness", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "average_score" in data
    assert "score_bands" in data
    assert "formula_weights" in data
    assert data["formula_weights"]["attendance"] == 0.20
    assert data["formula_weights"]["task_performance"] == 0.25
    assert data["formula_weights"]["skill_progress"] == 0.25
    assert data["formula_weights"]["projects_presentations"] == 0.15
    assert data["formula_weights"]["assessments"] == 0.10
    assert data["formula_weights"]["mentor_feedback"] == 0.05
    assert "disclaimer" in data
    assert "decision-support" in data["disclaimer"]


def test_dashboard_outcomes_endpoint(client):
    """Outcomes overview handles data safely without breaking."""
    response = client.get("/api/v1/admin/dashboard/outcomes", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "distribution" in data
    assert "ppo_offer_count" in data


def test_dashboard_security_alerts_no_biometrics(client, db_session):
    """Security alerts endpoint does not expose raw embeddings."""
    response = client.get("/api/v1/admin/dashboard/security-alerts", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "total_alerts" in data
    assert "items" in data
    for item in data["items"]:
        assert "embedding" not in item
        assert "vector" not in item


def test_dashboard_recent_activity(client, db_session):
    """Recent activity reads from immutable audit log table."""
    # Insert a sample audit log
    audit = AuditLog(
        actor_id="usr-admin-001",
        action="TEST_ADMIN_DASHBOARD_CHECK",
        entity="System",
        entity_id="test-001",
        new_values="Tested admin dashboard activity stream"
    )
    db_session.add(audit)
    db_session.commit()

    response = client.get("/api/v1/admin/dashboard/recent-activity", headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    actions = [i["action"] for i in data["items"]]
    assert "TEST_ADMIN_DASHBOARD_CHECK" in actions
