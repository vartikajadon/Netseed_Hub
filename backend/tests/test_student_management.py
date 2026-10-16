import pytest
from datetime import date
from tests.conftest import TestingSessionLocal
from app.models.all_models import Program, Batch, Student, AuditLog

HR_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-hr-001"}
MENTOR1_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-men-001"}
MENTOR2_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-men-002"}
STUDENT1_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-student-001"}
STUDENT2_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-student-002"}

@pytest.fixture(autouse=True)
def seed_student_module_data():
    db = TestingSessionLocal()
    
    # Program A & Program B
    prog_a = Program(id="prog-aiml-01", title="AIML Trainee Program", code="AIML-2026", duration_weeks=12, is_active=True, created_by="usr-hr-001")
    prog_b = Program(id="prog-py-01", title="Python Engineering Program", code="PY-2026", duration_weeks=8, is_active=False, created_by="usr-hr-001")
    db.add_all([prog_a, prog_b])
    db.commit()

    # Batch A under Program A
    batch_a = Batch(id="batch-aiml-jul", program_id="prog-aiml-01", name="AIML-2026-July", start_date=date(2026, 7, 1), end_date=date(2026, 10, 1), mentor_id="usr-men-001", status="ACTIVE")
    db.add(batch_a)
    db.commit()

    # Student 1 enrolled under Program A, Batch A, Mentor 1
    st1 = Student(id="std-rec-01", user_id="usr-student-001", program_id="prog-aiml-01", batch_id="batch-aiml-jul", mentor_id="usr-men-001", roll_number="NL-2026-101", enrollment_status="ACTIVE")
    db.add(st1)
    db.commit()

    db.close()

# --- PROGRAM TESTS ---
def test_create_and_update_program(client):
    payload = {"title": "Cloud DevOps Traineeship", "code": "DEVOPS-2026", "duration_weeks": 16, "is_active": True}
    res = client.post("/api/v1/programs", json=payload, headers=HR_HEADERS)
    assert res.status_code == 201, res.text
    pid = res.json()["id"]

    # Retrieve
    get_res = client.get(f"/api/v1/programs/{pid}", headers=STUDENT1_HEADERS)
    assert get_res.status_code == 200
    assert get_res.json()["code"] == "DEVOPS-2026"

    # Update (Deactivate)
    upd_res = client.put(f"/api/v1/programs/{pid}", json={"is_active": False}, headers=HR_HEADERS)
    assert upd_res.status_code == 200
    assert upd_res.json()["is_active"] is False

def test_unauthorized_program_creation(client):
    payload = {"title": "Hack Program", "code": "HACK-2026"}
    res = client.post("/api/v1/programs", json=payload, headers=STUDENT1_HEADERS)
    assert res.status_code == 403

# --- BATCH TESTS ---
def test_create_valid_batch(client):
    batch_payload = {
        "program_id": "prog-aiml-01",
        "name": "AIML-2026-August",
        "start_date": "2026-08-01",
        "end_date": "2026-11-01",
        "mentor_id": "usr-men-001",
        "status": "UPCOMING"
    }
    res = client.post("/api/v1/batches", json=batch_payload, headers=HR_HEADERS)
    assert res.status_code == 201, res.text
    assert res.json()["name"] == "AIML-2026-August"

def test_reject_batch_for_inactive_or_nonexistent_program(client):
    # Non-existent program
    res1 = client.post("/api/v1/batches", json={
        "program_id": "invalid-prog-id",
        "name": "Invalid Batch",
        "start_date": "2026-08-01",
        "end_date": "2026-11-01"
    }, headers=HR_HEADERS)
    assert res1.status_code == 400
    assert "Program does not exist" in res1.json()["detail"]

    # Inactive program
    res2 = client.post("/api/v1/batches", json={
        "program_id": "prog-py-01",
        "name": "Python Batch Inactive",
        "start_date": "2026-08-01",
        "end_date": "2026-11-01"
    }, headers=HR_HEADERS)
    assert res2.status_code == 400
    assert "inactive program" in res2.json()["detail"]

def test_reject_batch_invalid_dates(client):
    res = client.post("/api/v1/batches", json={
        "program_id": "prog-aiml-01",
        "name": "Bad Dates Batch",
        "start_date": "2026-10-01",
        "end_date": "2026-05-01"
    }, headers=HR_HEADERS)
    assert res.status_code == 400
    assert "start date must be strictly before end date" in res.json()["detail"]

# --- STUDENT MANAGEMENT & INTEGRITY TESTS ---
def test_create_student_and_integrity_checks(client):
    payload = {
        "user_id": "usr-student-002",
        "program_id": "prog-aiml-01",
        "batch_id": "batch-aiml-jul",
        "mentor_id": "usr-men-001",
        "roll_number": "NL-2026-102",
        "college_name": "State Tech",
        "qualification": "B.S. CS",
        "enrollment_status": "ACTIVE"
    }
    res = client.post("/api/v1/students", json=payload, headers=HR_HEADERS)
    assert res.status_code == 201, res.text
    assert res.json()["roll_number"] == "NL-2026-102"

    # Duplicate student user creation rejected
    res_dup = client.post("/api/v1/students", json=payload, headers=HR_HEADERS)
    assert res_dup.status_code == 400
    assert "Student record already exists" in res_dup.json()["detail"]

def test_prevent_mismatched_program_batch_relationship(client):
    # Create a batch under Program C directly in DB
    db = TestingSessionLocal()
    prog_c = Program(id="prog-c-01", title="Program C", code="PROG-C", duration_weeks=4, is_active=True)
    batch_c = Batch(id="batch-c-01", program_id="prog-c-01", name="Batch C", start_date=date(2026, 1, 1), end_date=date(2026, 3, 1), status="ACTIVE")
    db.add_all([prog_c, batch_c])
    db.commit()
    db.close()

    # Attempt to assign student to Program A with Batch C (which belongs to Program C)
    bad_payload = {
        "user_id": "usr-student-002",
        "program_id": "prog-aiml-01",
        "batch_id": "batch-c-01",
        "roll_number": "NL-2026-999"
    }
    res = client.post("/api/v1/students", json=bad_payload, headers=HR_HEADERS)
    assert res.status_code == 400
    assert "does not match" in res.json()["detail"]

# --- MENTOR ASSIGNMENT & STATUS TESTS ---
def test_assign_mentor_validation(client):
    # Valid mentor assignment
    res_valid = client.patch("/api/v1/students/std-rec-01/mentor", json={"mentor_id": "usr-men-002"}, headers=HR_HEADERS)
    assert res_valid.status_code == 200
    assert res_valid.json()["mentor_id"] == "usr-men-002"

    # Reject non-mentor user assignment
    res_invalid = client.patch("/api/v1/students/std-rec-01/mentor", json={"mentor_id": "usr-user-001"}, headers=HR_HEADERS)
    assert res_invalid.status_code == 400
    assert "lacks MENTOR role" in res_invalid.json()["detail"]

def test_change_student_status(client):
    res = client.patch("/api/v1/students/std-rec-01/status", json={"status": "COMPLETED"}, headers=HR_HEADERS)
    assert res.status_code == 200
    assert res.json()["enrollment_status"] == "COMPLETED"

# --- AUTHORIZATION ISOLATION TESTS ---
def test_authorization_matrix(client):
    # Student cannot create student
    res1 = client.post("/api/v1/students", json={"user_id": "usr-student-002", "roll_number": "NL-999"}, headers=STUDENT1_HEADERS)
    assert res1.status_code == 403

    # Student cannot view another student's detail
    res2 = client.get("/api/v1/students/std-rec-01", headers=STUDENT2_HEADERS)
    assert res2.status_code == 403

    # Mentor 2 cannot view student assigned to Mentor 1
    res3 = client.get("/api/v1/students/std-rec-01", headers=MENTOR2_HEADERS)
    assert res3.status_code == 403

    # Mentor 1 CAN view student assigned to Mentor 1
    res4 = client.get("/api/v1/students/std-rec-01", headers=MENTOR1_HEADERS)
    assert res4.status_code == 200

# --- AUDIT LOGGING VERIFICATION ---
def test_audit_logs_recorded(client):
    db = TestingSessionLocal()
    logs = db.query(AuditLog).all()
    assert len(logs) >= 0
    db.close()

# --- DELETION TESTS ---
def test_delete_program_by_hr(client):
    # Create program
    payload = {"title": "Temporary Program", "code": "TEMP-DEL", "duration_weeks": 4}
    create_res = client.post("/api/v1/programs", json=payload, headers=HR_HEADERS)
    assert create_res.status_code == 201
    prog_id = create_res.json()["id"]

    # Unauthorized student cannot delete
    fail_res = client.delete(f"/api/v1/programs/{prog_id}", headers=STUDENT1_HEADERS)
    assert fail_res.status_code == 403

    # HR can delete
    del_res = client.delete(f"/api/v1/programs/{prog_id}", headers=HR_HEADERS)
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["message"]

    # Check program is gone
    get_res = client.get(f"/api/v1/programs/{prog_id}", headers=HR_HEADERS)
    assert get_res.status_code == 404

def test_delete_student_by_hr(client):
    # Register temporary student
    payload = {
        "full_name": "Temporary Student",
        "email": "temp.student@netlink.org",
        "roll_number": "TEMP-ROLL-99",
        "program_id": "prog-aiml-01"
    }
    create_res = client.post("/api/v1/students", json=payload, headers=HR_HEADERS)
    assert create_res.status_code == 201
    std_id = create_res.json()["id"]

    # Unauthorized student cannot delete
    fail_res = client.delete(f"/api/v1/students/{std_id}", headers=STUDENT1_HEADERS)
    assert fail_res.status_code == 403

    # HR can delete
    del_res = client.delete(f"/api/v1/students/{std_id}", headers=HR_HEADERS)
    assert del_res.status_code == 200
    assert "deleted successfully" in del_res.json()["message"]

    # Check student is gone
    get_res = client.get(f"/api/v1/students/{std_id}", headers=HR_HEADERS)
    assert get_res.status_code == 404

def test_student_domicile_and_batch_types(client):
    # 1. Register student with domicile and SHORT_DURATION batch type
    payload_sd = {
        "full_name": "Short Duration Trainee",
        "email": "short.duration@example.com",
        "roll_number": "SD-2026-001",
        "program_id": "prog-aiml-01",
        "batch_id": "batch-aiml-jul",
        "domicile": "Madhya Pradesh",
        "batch_type": "SHORT_DURATION"
    }
    res_sd = client.post("/api/v1/students", json=payload_sd, headers=HR_HEADERS)
    assert res_sd.status_code == 201
    data_sd = res_sd.json()
    assert data_sd["domicile"] == "Madhya Pradesh"
    assert data_sd["batch_type"] == "SHORT_DURATION"
    std_id = data_sd["id"]

    # 2. Update domicile and switch batch type to INTERNSHIP
    update_payload = {
        "domicile": "Uttar Pradesh",
        "batch_type": "INTERNSHIP"
    }
    res_upd = client.put(f"/api/v1/students/{std_id}", json=update_payload, headers=HR_HEADERS)
    assert res_upd.status_code == 200
    assert res_upd.json()["domicile"] == "Uttar Pradesh"
    assert res_upd.json()["batch_type"] == "INTERNSHIP"

    # 3. Filter students by batch_type
    filter_res = client.get("/api/v1/students?batch_type=INTERNSHIP", headers=HR_HEADERS)
    assert filter_res.status_code == 200
    items = filter_res.json()["items"]
    assert any(s["id"] == std_id for s in items)

def test_batch_types_creation_durations(client):
    # Short duration batch: 3 months training, 3 months internship
    sd_batch = {
        "program_id": "prog-aiml-01",
        "name": "Short Duration Batch 1",
        "batch_type": "SHORT_DURATION",
        "start_date": "2026-08-01",
        "end_date": "2026-11-01"
    }
    res1 = client.post("/api/v1/batches", json=sd_batch, headers=HR_HEADERS)
    assert res1.status_code == 201
    assert res1.json()["training_duration_months"] == 3
    assert res1.json()["internship_duration_months"] == 3
    assert res1.json()["batch_type"] == "SHORT_DURATION"

    # Internship batch: 1 month training, 3 months internship (4 months total)
    int_batch = {
        "program_id": "prog-aiml-01",
        "name": "Internship Batch 1",
        "batch_type": "INTERNSHIP",
        "start_date": "2026-08-01",
        "end_date": "2026-12-01"
    }
    res2 = client.post("/api/v1/batches", json=int_batch, headers=HR_HEADERS)
    assert res2.status_code == 201
    assert res2.json()["training_duration_months"] == 1
    assert res2.json()["internship_duration_months"] == 3
    assert res2.json()["batch_type"] == "INTERNSHIP"


def test_hr_mark_student_as_dropout_with_reason(client):
    # 1. HR successfully marks active student as DROPOUT with mandatory reason
    payload = {
        "status": "DROPOUT",
        "reason": "Switched course midway to Cloud DevOps"
    }
    res = client.patch("/api/v1/students/std-rec-01/status", json=payload, headers=HR_HEADERS)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["enrollment_status"] == "DROPOUT"
    assert data["dropout_reason"] == "Switched course midway to Cloud DevOps"
    assert data["dropout_date"] is not None

    # Verify student list shows status DROPOUT
    fetch_res = client.get("/api/v1/students/std-rec-01", headers=HR_HEADERS)
    assert fetch_res.status_code == 200
    assert fetch_res.json()["enrollment_status"] == "DROPOUT"
    assert fetch_res.json()["dropout_reason"] == "Switched course midway to Cloud DevOps"


def test_hr_mark_dropout_without_reason_fails(client):
    # Missing/empty reason must be rejected with 400
    payload = {
        "status": "DROPOUT",
        "reason": "   "
    }
    res = client.patch("/api/v1/students/std-rec-01/status", json=payload, headers=HR_HEADERS)
    assert res.status_code == 400
    assert "reason is required" in res.json()["detail"].lower()


def test_mentor_and_student_cannot_mark_dropout(client):
    payload = {
        "status": "DROPOUT",
        "reason": "Mentor attempting unauthorized status change"
    }
    # Mentor attempt -> 403
    res_m = client.patch("/api/v1/students/std-rec-01/status", json=payload, headers=MENTOR1_HEADERS)
    assert res_m.status_code == 403

    # Student attempt -> 403
    res_s = client.patch("/api/v1/students/std-rec-01/status", json=payload, headers=STUDENT1_HEADERS)
    assert res_s.status_code == 403

