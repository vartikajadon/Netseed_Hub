import pytest
from datetime import date, datetime
from app.models.all_models import User, Student, Batch, Program, CalendarEvent, InstitutionTraining, InstitutionStudent, RegularizationRequest

ADMIN_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-admin-001"}
HR_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-hr-001"}
STUDENT_HEADERS = {"Authorization": "Bearer mock_jwt_token_usr-student-001"}

def test_institution_training_crud(client):
    # 1. Create Institution Training with initial students
    payload = {
        "institution_name": "LNCT Bhopal",
        "training_title": "Full Stack Cloud & DevOps Engineering",
        "batch_name": "LNCT-2026-B1",
        "start_date": "2026-03-01",
        "end_date": "2026-06-30",
        "cost_per_batch": 125000.0,
        "trainer_name": "Alex Rivera",
        "status": "ACTIVE",
        "description": "Custom university batch training for 6th sem students",
        "students": [
            {
                "student_name": "Aman Sharma",
                "student_roll_no": "0103CS221001",
                "email": "aman.sharma@lnct.ac.in",
                "contact_no": "+919876543210",
                "course": "B.Tech",
                "branch": "Computer Science & Engineering",
                "training": "Full Stack Cloud & DevOps",
                "cost_per_batch": 125000.0,
                "notes": "Fast learner"
            },
            {
                "student_name": "Pooja Verma",
                "student_roll_no": "0103CS221002",
                "email": "pooja.verma@lnct.ac.in",
                "contact_no": "+919876543211",
                "course": "B.Tech",
                "branch": "Information Technology",
                "training": "Full Stack Cloud & DevOps",
                "cost_per_batch": 125000.0,
                "notes": None
            }
        ]
    }

    res = client.post("/api/v1/institution-trainings", json=payload, headers=ADMIN_HEADERS)
    assert res.status_code == 201
    data = res.json()
    assert data["institution_name"] == "LNCT Bhopal"
    assert data["cost_per_batch"] == 125000.0
    assert len(data["students"]) == 2
    training_id = data["id"]

    # 2. Add another student
    student_payload = {
        "student_name": "Rohan Patel",
        "student_roll_no": "0103CS221003",
        "email": "rohan.patel@lnct.ac.in",
        "contact_no": "+919876543212",
        "course": "B.Tech",
        "branch": "ECE",
        "training": "Full Stack Cloud & DevOps",
        "cost_per_batch": 125000.0,
        "notes": "Added late"
    }
    res_st = client.post(f"/api/v1/institution-trainings/{training_id}/students", json=student_payload, headers=ADMIN_HEADERS)
    assert res_st.status_code == 201
    st_data = res_st.json()
    assert st_data["student_name"] == "Rohan Patel"
    student_id = st_data["id"]

    # 3. List trainings
    res_list = client.get("/api/v1/institution-trainings", headers=ADMIN_HEADERS)
    assert res_list.status_code == 200
    trainings = res_list.json()
    assert any(t["id"] == training_id for t in trainings)

    # 4. Delete added student
    res_del_st = client.delete(f"/api/v1/institution-trainings/{training_id}/students/{student_id}", headers=ADMIN_HEADERS)
    assert res_del_st.status_code == 204

    # 5. Clean up training
    res_del = client.delete(f"/api/v1/institution-trainings/{training_id}", headers=ADMIN_HEADERS)
    assert res_del.status_code == 204


def test_calendar_events_endpoint(client):
    # Fetch calendar events
    res = client.get("/api/v1/calendar/events", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0

    # Verify festivals, off days, and birthdays exist
    festivals = [e for e in events if e["event_type"] == "FESTIVAL"]
    birthdays = [e for e in events if e["event_type"] == "BIRTHDAY"]
    off_days = [e for e in events if e["is_off_day"] is True]

    assert len(festivals) > 0
    assert len(birthdays) > 0
    assert len(off_days) > 0

    # Verify Netlink organization anniversary exists
    netlink_event = next((e for e in birthdays if "Netlink" in e["title"]), None)
    assert netlink_event is not None


def test_student_regularization_request_workflow(client, db_session):
    # Ensure student profile exists in db
    st = db_session.query(Student).filter(Student.user_id == "usr-student-001").first()
    if not st:
        st = Student(
            id="st-test-001",
            user_id="usr-student-001",
            roll_number="NL-2026-REG-01"
        )
        db_session.add(st)
        db_session.commit()

    # 1. Student submits regularization request
    req_payload = {
        "date": "2026-03-15",
        "reason": "Biometric face camera was updating drivers and GPS drift failed to punch in on time",
        "proposed_working_hours": 8.0
    }
    res = client.post("/api/v1/attendance/regularization-requests", json=req_payload, headers=STUDENT_HEADERS)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "PENDING"
    assert data["assigned_to_name"] == "Prerna Verma (HR)"
    req_id = data["id"]

    # 2. Student views their requests
    res_my = client.get("/api/v1/attendance/my-regularization-requests", headers=STUDENT_HEADERS)
    assert res_my.status_code == 200
    my_reqs = res_my.json()
    assert any(r["id"] == req_id for r in my_reqs)

    # 3. HR views all requests
    res_hr = client.get("/api/v1/attendance/regularization-requests?status=PENDING", headers=HR_HEADERS)
    assert res_hr.status_code == 200
    hr_reqs = res_hr.json()
    assert any(r["id"] == req_id for r in hr_reqs)

    # 4. HR approves request
    review_payload = {
        "action": "APPROVE",
        "review_notes": "Verified entry with campus security log. Approved.",
        "status": "REGULARIZED",
        "override_working_hours": 8.0
    }
    res_review = client.post(f"/api/v1/attendance/regularization-requests/{req_id}/review", json=review_payload, headers=HR_HEADERS)
    assert res_review.status_code == 200
    reviewed_data = res_review.json()
    assert reviewed_data["status"] == "APPROVED"
    assert reviewed_data["reviewed_by_name"] == "HR Test"


def test_student_dob_and_calendar_sync_and_hr_reminders(client, db_session):
    from datetime import datetime, timedelta
    today = datetime.utcnow().date()
    tomorrow = today + timedelta(days=1)

    # 1. Register a new student with DOB (tomorrow's month and day)
    # This simulates a student whose birthday is exactly tomorrow (1 day before)
    dob_str = f"2002-{tomorrow.month:02d}-{tomorrow.day:02d}"
    student_payload = {
        "full_name": "Aarav Patel",
        "email": "aarav.patel.test@netlink.org",
        "roll_number": "NL-2026-TEST-DOB",
        "dob": dob_str,
        "contact_number": "+919988776655",
        "age": 24,
        "batch_type": "TECH_MASTER"
    }

    res_reg = client.post("/api/v1/students", json=student_payload, headers=HR_HEADERS)
    assert res_reg.status_code == 201
    st_data = res_reg.json()
    assert st_data["dob"] == dob_str
    st_id = st_data["id"]

    # 2. Verify that birthday event was automatically created in calendar
    res_cal = client.get("/api/v1/calendar/events", headers=HR_HEADERS)
    assert res_cal.status_code == 200
    events = res_cal.json()
    aarav_event = next((e for e in events if "Aarav Patel" in e["title"]), None)
    assert aarav_event is not None
    assert aarav_event["event_type"] == "BIRTHDAY"

    # 3. Verify HR birthday reminder endpoint returns Aarav Patel in one_day_before
    res_reminders = client.get("/api/v1/calendar/birthday-reminders", headers=HR_HEADERS)
    assert res_reminders.status_code == 200
    reminders = res_reminders.json()
    assert reminders["one_day_before_count"] >= 1
    one_day_student = next((s for s in reminders["one_day_before"] if s["student_id"] == st_id), None)
    assert one_day_student is not None
    assert one_day_student["student_name"] == "Aarav Patel"
    assert one_day_student["days_until"] == 1
    assert one_day_student["is_tomorrow"] is True

    # 4. Update student DOB and verify calendar event automatically updates
    new_dob = "2002-12-20"
    res_upd = client.put(f"/api/v1/students/{st_id}", json={"dob": new_dob}, headers=HR_HEADERS)
    assert res_upd.status_code == 200
    assert res_upd.json()["dob"] == new_dob

    # Re-verify calendar event date updated
    res_cal_updated = client.get("/api/v1/calendar/events", headers=HR_HEADERS)
    assert res_cal_updated.status_code == 200
    events_updated = res_cal_updated.json()
    aarav_event_updated = next((e for e in events_updated if "Aarav Patel" in e["title"]), None)
    assert aarav_event_updated is not None
    assert aarav_event_updated["date"] == "2026-12-20"

