from datetime import datetime, timedelta
import pytest
from app.models.all_models import User, Student, Batch, Program, Assessment, AssessmentSubmission

def test_assessment_lifecycle_and_evaluation(client, db_session):
    # 1. Setup mentor, program, batch, student
    mentor_user = User(
        id="usr-mentor-test-99",
        email="mentor_assessment@test.com",
        full_name="Assessment Mentor",
        role="MENTOR",
        is_active=True
    )
    student_user = User(
        id="usr-student-test-99",
        email="student_assessment@test.com",
        full_name="Student Testee",
        role="STUDENT",
        is_active=True
    )
    db_session.add_all([mentor_user, student_user])
    db_session.commit()

    program = Program(
        title="Full Stack Cloud Track",
        code="FS-CLOUD-2026",
        duration_weeks=24
    )
    db_session.add(program)
    db_session.commit()

    batch = Batch(
        name="Batch Cloud Alpha",
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
        roll_number="STU-ASSESS-001"
    )
    db_session.add(student)
    db_session.commit()

    # 2. Mentor creates Entry Level Assessment
    create_payload = {
        "title": "Entry Level Foundation Test",
        "description": "Week 1 baseline assessment on programming fundamentals",
        "level": "ENTRY_LEVEL",
        "batch_id": batch.id,
        "scheduled_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "duration_minutes": 60,
        "total_marks": 100,
        "passing_marks": 40,
        "paper_content": "Question 1: Explain Big O notation. Question 2: Implement quicksort.",
        "paper_file_url": "https://example.com/entry_paper.pdf",
        "paper_file_name": "entry_paper.pdf"
    }

    headers_mentor = {"Authorization": f"Bearer mock_jwt_token_{mentor_user.id}"}
    headers_student = {"Authorization": f"Bearer mock_jwt_token_{student_user.id}"}

    res = client.post("/api/v1/assessments", json=create_payload, headers=headers_mentor)
    assert res.status_code == 201
    created_data = res.json()
    assessment_id = created_data["id"]
    assert created_data["level"] == "ENTRY_LEVEL"
    assert created_data["is_unlocked"] is False
    assert created_data["duration_minutes"] == 60

    # 3. Student views assessment (within 1 week => visible, but paper content hidden and can_attempt is False)
    res_stu = client.get("/api/v1/assessments", headers=headers_student)
    assert res_stu.status_code == 200
    stu_assessments = res_stu.json()
    assert len(stu_assessments) == 1
    assert stu_assessments[0]["id"] == assessment_id
    assert stu_assessments[0]["can_attempt"] is False
    assert stu_assessments[0]["paper_content"] is None  # Hidden because locked!

    # 4. Student attempts to submit while locked => Rejected 400
    sub_payload = {
        "submission_link": "https://github.com/student/entry-test-repo",
        "submission_notes": "Implemented all solutions in main.py"
    }
    res_sub_locked = client.post(f"/api/v1/assessments/{assessment_id}/submit", json=sub_payload, headers=headers_student)
    assert res_sub_locked.status_code == 400
    assert "locked" in res_sub_locked.json()["detail"].lower()

    # 5. Mentor edits duration to 90 mins and unlocks assessment
    res_edit = client.put(
        f"/api/v1/assessments/{assessment_id}",
        json={"duration_minutes": 90},
        headers=headers_mentor
    )
    assert res_edit.status_code == 200
    assert res_edit.json()["duration_minutes"] == 90

    res_unlock = client.put(
        f"/api/v1/assessments/{assessment_id}/toggle-lock",
        json={"is_unlocked": True},
        headers=headers_mentor
    )
    assert res_unlock.status_code == 200
    assert res_unlock.json()["is_unlocked"] is True

    # 6. Now student views: paper content is visible and can_attempt is True
    res_stu_unlocked = client.get(f"/api/v1/assessments/{assessment_id}", headers=headers_student)
    assert res_stu_unlocked.status_code == 200
    assert res_stu_unlocked.json()["can_attempt"] is True
    assert "Big O notation" in res_stu_unlocked.json()["paper_content"]

    # 7. Student submits answer link
    res_sub = client.post(f"/api/v1/assessments/{assessment_id}/submit", json=sub_payload, headers=headers_student)
    assert res_sub.status_code == 200
    submission_data = res_sub.json()
    submission_id = submission_data["id"]
    assert submission_data["status"] == "SUBMITTED"
    assert submission_data["submission_link"] == "https://github.com/student/entry-test-repo"

    # 8. Mentor evaluates submission: gives 88 marks
    eval_payload = {
        "marks_obtained": 88.0,
        "feedback": "Strong understanding of algorithmic complexity and clean code."
    }
    res_eval = client.put(
        f"/api/v1/assessment-submissions/{submission_id}/evaluate",
        json=eval_payload,
        headers=headers_mentor
    )
    assert res_eval.status_code == 200
    evaluated_sub = res_eval.json()
    assert evaluated_sub["status"] == "EVALUATED"
    assert evaluated_sub["marks_obtained"] == 88.0
    assert evaluated_sub["is_passed"] is True

    # 9. Check Score Sheet matrix
    res_sheet = client.get(f"/api/v1/assessments/score-sheet/matrix?batch_id={batch.id}", headers=headers_mentor)
    assert res_sheet.status_code == 200
    matrix = res_sheet.json()
    assert len(matrix) == 1
    student_row = matrix[0]
    assert student_row["roll_number"] == "STU-ASSESS-001"
    assert student_row["entry_level"]["marks_obtained"] == 88.0
    assert student_row["entry_level"]["is_passed"] is True
    assert student_row["total_obtained"] == 88.0

    # 10. Mentor updates project URL and approves Certificate Release
    res_scoresheet_update = client.put(
        f"/api/v1/assessments/scoresheet/student/{student.id}",
        json={
            "project_url": "https://github.com/student/cloud-capstone-project",
            "certificate_approved_by_mentor": True
        },
        headers=headers_mentor
    )
    assert res_scoresheet_update.status_code == 200
    assert res_scoresheet_update.json()["certificate_approved_by_mentor"] is True
    assert res_scoresheet_update.json()["project_url"] == "https://github.com/student/cloud-capstone-project"

    # 11. Mentor directly edits student assessment marks from scoresheet
    res_direct_marks = client.put(
        f"/api/v1/assessments/scoresheet/student/{student.id}/marks",
        json={
            "assessment_id": assessment_id,
            "marks_obtained": 95.0,
            "feedback": "Outstanding performance in technical viva."
        },
        headers=headers_mentor
    )
    assert res_direct_marks.status_code == 200
    assert res_direct_marks.json()["marks_obtained"] == 95.0

    # 12. Mentor sends finalized scoresheet to HR and Managers
    res_send_mgmt = client.post(
        f"/api/v1/assessments/scoresheet/batch/{batch.id}/send-to-management",
        json={"notes": "All trainees completed capstone projects. Ready for certificates."},
        headers=headers_mentor
    )
    assert res_send_mgmt.status_code == 200
    assert res_send_mgmt.json()["certified_count"] == 1

    # 13. Student submits Trainer Feedback (Named and Anonymous)
    # Named Feedback
    named_payload = {
        "trainer_id": mentor_user.id,
        "batch_id": batch.id,
        "is_anonymous": False,
        "technical_rating": 5,
        "technical_text": "Exceptional knowledge in distributed systems.",
        "teaching_rating": 5,
        "teaching_text": "Very clear live coding demos.",
        "doubt_solving_rating": 4,
        "overall_feedback_text": "One of the best mentors I've trained under."
    }
    res_named_fb = client.post("/api/v1/trainer-feedbacks", json=named_payload, headers=headers_student)
    assert res_named_fb.status_code == 201
    named_data = res_named_fb.json()
    assert named_data["student_name"] == "Student Testee"
    assert named_data["is_anonymous"] is False

    # Anonymous Feedback
    anon_payload = {
        "trainer_id": mentor_user.id,
        "batch_id": batch.id,
        "is_anonymous": True,
        "technical_rating": 4,
        "teaching_rating": 4,
        "overall_feedback_text": "Pacing was a bit fast in week 3 but overall great."
    }
    res_anon_fb = client.post("/api/v1/trainer-feedbacks", json=anon_payload, headers=headers_student)
    assert res_anon_fb.status_code == 201
    anon_data = res_anon_fb.json()
    assert anon_data["is_anonymous"] is True

    # Mentor views feedback -> Anonymous student is masked
    res_mentor_fb_list = client.get("/api/v1/trainer-feedbacks", headers=headers_mentor)
    assert res_mentor_fb_list.status_code == 200
    fb_list = res_mentor_fb_list.json()
    assert len(fb_list) == 2
    anon_item = next(item for item in fb_list if item["is_anonymous"] is True)
    assert anon_item["student_name"] == "Anonymous Trainee"
    assert anon_item["student_id"] is None

