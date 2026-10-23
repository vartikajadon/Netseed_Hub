import pytest
from app.models.all_models import Student, Batch, Program
from tests.conftest import TestingSessionLocal

@pytest.fixture
def auth_headers():
    def _headers(role: str, user_id: str):
        return {"Authorization": f"Bearer mock_jwt_token_{user_id}"}
    return _headers

@pytest.fixture
def setup_student():
    from datetime import date
    db = TestingSessionLocal()
    prog = Program(id="prog-test-01", title="Software Engineering", code="SE-2026", duration_weeks=24, is_active=True)
    batch = Batch(id="batch-test-01", program_id="prog-test-01", name="Batch SE-2026", start_date=date(2026, 1, 1), end_date=date(2026, 7, 1), status="ACTIVE")
    db.add_all([prog, batch])
    db.commit()

    student = Student(
        id="st-test-001",
        user_id="usr-student-001",
        program_id="prog-test-01",
        batch_id="batch-test-01",
        roll_number="NL-2026-001",
        college_name="UIT RGPV",
        enrollment_status="ACTIVE",
        total_fees=45000.0,
        installment_type="TWO_INSTALLMENTS",
        payment_mode="ONLINE"
    )
    db.add(student)
    db.commit()
    db.close()
    return "st-test-001"

def test_no_dues_workflow(client, auth_headers, setup_student):
    hr_headers = auth_headers("HR", "usr-hr-001")
    student_headers = auth_headers("STUDENT", "usr-student-001")

    # 1. HR creates a new dynamic checklist option
    opt_payload = {
        "item_name": "Library Books & ID Card Returned",
        "department": "LIBRARY",
        "is_required": True
    }
    opt_res = client.post("/api/v1/no-dues/options", json=opt_payload, headers=hr_headers)
    assert opt_res.status_code == 201
    opt_data = opt_res.json()
    assert opt_data["item_name"] == "Library Books & ID Card Returned"

    # List options
    opts_res = client.get("/api/v1/no-dues/options", headers=hr_headers)
    assert opts_res.status_code == 200
    assert len(opts_res.json()) >= 1

    # 2. HR issues a No Dues clearance form to the student
    issue_payload = {
        "student_id": "st-test-001",
        "title": "Final Internship Completion No Dues Clearance",
        "checklist_items": [
            {
                "id": "chk-1",
                "item_name": "Library Clearance",
                "department": "LIBRARY",
                "is_cleared": False
            },
            {
                "id": "chk-2",
                "item_name": "Lab Equipment Handover",
                "department": "IT_INFRA",
                "is_cleared": False
            }
        ],
        "remarks": "Please clear all department assets prior to relieving."
    }
    issue_res = client.post("/api/v1/no-dues/requests", json=issue_payload, headers=hr_headers)
    assert issue_res.status_code == 201
    request_data = issue_res.json()
    assert request_data["status"] == "PENDING_STUDENT"
    request_id = request_data["id"]

    # 3. Student fetches pending No Dues (triggers dashboard popup)
    my_pending_res = client.get("/api/v1/no-dues/requests/my-pending", headers=student_headers)
    assert my_pending_res.status_code == 200
    assert my_pending_res.json() is not None
    assert my_pending_res.json()["id"] == request_id

    # 4. Student checks off items and submits form
    submit_payload = {
        "checklist_items": [
            {
                "id": "chk-1",
                "item_name": "Library Clearance",
                "department": "LIBRARY",
                "is_cleared": True,
                "student_remarks": "Returned all 3 textbooks."
            },
            {
                "id": "chk-2",
                "item_name": "Lab Equipment Handover",
                "department": "IT_INFRA",
                "is_cleared": True,
                "student_remarks": "Returned test laptop and access card."
            }
        ],
        "remarks": "All assets returned to respective desks."
    }
    submit_res = client.post(f"/api/v1/no-dues/requests/{request_id}/submit-by-student", json=submit_payload, headers=student_headers)
    assert submit_res.status_code == 200
    assert submit_res.json()["status"] == "SUBMITTED"

    # 5. HR reviews and approves
    review_payload = {
        "action": "APPROVE",
        "remarks": "Verified with Library and IT Admin. Clearance granted."
    }
    review_res = client.post(f"/api/v1/no-dues/requests/{request_id}/review", json=review_payload, headers=hr_headers)
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"


def test_fees_workflow(client, auth_headers, setup_student):
    hr_headers = auth_headers("HR", "usr-hr-001")
    student_headers = auth_headers("STUDENT", "usr-student-001")

    # 1. Check initial fee summary
    fee_summary_res = client.get("/api/v1/fees/students", headers=hr_headers)
    assert fee_summary_res.status_code == 200
    summaries = fee_summary_res.json()
    assert len(summaries) >= 1
    target = next(s for s in summaries if s["student_id"] == "st-test-001")
    assert target["total_fees"] == 45000.0
    assert target["total_paid"] == 0.0
    assert target["remaining_fees"] == 45000.0
    assert target["payment_status"] == "UNPAID"

    # 2. Record first installment payment
    pay1_payload = {
        "student_id": "st-test-001",
        "amount_paid": 20000.0,
        "payment_date": "2026-02-15",
        "payment_mode": "UPI",
        "transaction_reference": "UPI-TXN-987654321",
        "receipt_number": "RCP-2026-001",
        "notes": "First installment paid"
    }
    pay1_res = client.post("/api/v1/fees/payments", json=pay1_payload, headers=hr_headers)
    assert pay1_res.status_code == 201

    # Check partial status
    summary2_res = client.get("/api/v1/fees/students", headers=student_headers)
    assert summary2_res.status_code == 200
    s2 = summary2_res.json()[0]
    assert s2["total_paid"] == 20000.0
    assert s2["remaining_fees"] == 25000.0
    assert s2["payment_status"] == "PARTIAL"

    # 3. Record remaining payment
    pay2_payload = {
        "student_id": "st-test-001",
        "amount_paid": 25000.0,
        "payment_date": "2026-03-20",
        "payment_mode": "NET_BANKING",
        "receipt_number": "RCP-2026-002"
    }
    pay2_res = client.post("/api/v1/fees/payments", json=pay2_payload, headers=hr_headers)
    assert pay2_res.status_code == 201

    # Check paid status
    summary3_res = client.get(f"/api/v1/fees/students/{setup_student}", headers=hr_headers)
    assert summary3_res.status_code == 200
    s3 = summary3_res.json()
    assert s3["total_paid"] == 45000.0
    assert s3["remaining_fees"] == 0.0
    assert s3["payment_status"] == "PAID"
    assert s3["payments_count"] == 2


def test_letters_workflow(client, auth_headers, setup_student):
    hr_headers = auth_headers("HR", "usr-hr-001")
    student_headers = auth_headers("STUDENT", "usr-student-001")

    # 1. HR issues offer letter
    letter_payload = {
        "title": "Official Internship Offer Letter",
        "letter_type": "OFFER_LETTER",
        "recipient_student_id": "st-test-001",
        "recipient_name": "Student One",
        "recipient_email": "student1@netlink.org",
        "issue_date": "2026-01-10",
        "content": "Dear Student One, We are pleased to offer you the position of Trainee Engineer."
    }
    issue_res = client.post("/api/v1/letters", json=letter_payload, headers=hr_headers)
    assert issue_res.status_code == 201
    letter_id = issue_res.json()["id"]
    assert issue_res.json()["status"] == "SENT"

    # 2. Student fetches letters
    my_letters_res = client.get("/api/v1/letters/my-letters", headers=student_headers)
    assert my_letters_res.status_code == 200
    letters = my_letters_res.json()
    assert len(letters) >= 1
    assert letters[0]["id"] == letter_id

    # 3. Student acknowledges letter
    ack_res = client.post(f"/api/v1/letters/{letter_id}/acknowledge", json={}, headers=student_headers)
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"


def test_certificates_workflow(client, auth_headers, setup_student):
    hr_headers = auth_headers("HR", "usr-hr-001")
    mentor_headers = auth_headers("MENTOR", "usr-men-001")
    student_headers = auth_headers("STUDENT", "usr-student-001")

    cert_payload = {
        "title": "Certificate of Excellence in Cloud Architecture",
        "certificate_type": "EXCELLENCE",
        "recipient_student_id": "st-test-001",
        "recipient_name": "Student One",
        "recipient_roll_no": "NL-2026-001",
        "issue_date": "2026-03-31",
        "credential_id": "NETSEED-CERT-2026-SE01",
        "description": "Recognizing top 5% performance in microservices development."
    }

    # 1. Before mentor approval, certificate issuance by HR is locked (HTTP 400)
    locked_res = client.post("/api/v1/certificates", json=cert_payload, headers=hr_headers)
    assert locked_res.status_code == 400
    assert "locked" in locked_res.json()["detail"].lower()

    # 2. Mentor approves certificate release for student
    release_res = client.put("/api/v1/students/st-test-001/release-certificate", json={"approve": True}, headers=mentor_headers)
    assert release_res.status_code == 200
    assert release_res.json()["certificate_approved_by_mentor"] is True

    # 3. Now HR can successfully issue the certificate
    cert_res = client.post("/api/v1/certificates", json=cert_payload, headers=hr_headers)
    assert cert_res.status_code == 201
    assert cert_res.json()["status"] == "ISSUED"

    # 4. Student retrieves certificates
    my_certs_res = client.get("/api/v1/certificates/my-certificates", headers=student_headers)
    assert my_certs_res.status_code == 200
    assert len(my_certs_res.json()) >= 1
    assert my_certs_res.json()[0]["credential_id"] == "NETSEED-CERT-2026-SE01"


def test_notifications_workflow(client, auth_headers):
    student_headers = auth_headers("STUDENT", "usr-student-001")
    mentor_headers = auth_headers("MENTOR", "usr-men-001")

    # 1. Create a notification for mentor on task completion
    notif_payload = {
        "title": "Task Submitted: Docker & FastAPI",
        "message": "Student One submitted final pull request.",
        "notification_type": "TASK_COMPLETED",
        "target_role": "MENTOR"
    }
    create_res = client.post("/api/v1/notifications", json=notif_payload, headers=student_headers)
    assert create_res.status_code == 201
    notif_id = create_res.json()["id"]

    # 2. Mentor views notifications
    list_res = client.get("/api/v1/notifications", headers=mentor_headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(n["id"] == notif_id for n in items)

    # 3. Mentor marks notification as read
    read_res = client.put(f"/api/v1/notifications/{notif_id}/read", json={}, headers=mentor_headers)
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True
