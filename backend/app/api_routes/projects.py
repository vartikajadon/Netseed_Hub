from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_role
from app.models.all_models import User, Student, Batch
from app.schemas.project_schemas import (
    ProjectBatchAssignPayload,
    ProjectStudentUpdatePayload,
    StudentProjectSubmitPayload,
    ProjectStudentItem,
    ProjectBatchResponse,
)
from app.api_routes.notifications import create_notification

router = APIRouter(prefix="/projects", tags=["Projects"])

def _serialize_project_student(s: Student) -> ProjectStudentItem:
    u = s.user
    b = s.batch
    return ProjectStudentItem(
        student_id=s.id,
        student_name=u.full_name if u else s.roll_number,
        student_email=u.email if u else None,
        roll_number=s.roll_number,
        batch_id=s.batch_id or "",
        batch_name=b.name if b else "Unassigned Batch",
        passout_year=s.passout_year,
        cv_url=s.cv_url,
        cv_file_name=s.cv_file_name,
        cv_updated_at=s.cv_updated_at,
        project_title=s.project_title,
        project_description=s.project_description,
        project_status=s.project_status or "NOT_ASSIGNED",
        project_url=s.project_url,
        project_assigned_at=s.project_assigned_at,
        project_submitted_at=s.project_submitted_at,
    )


@router.get("/batch/{batch_id}", response_model=ProjectBatchResponse, summary="List Students Project Status in Batch")
def get_batch_projects(
    batch_id: str,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    students = db.query(Student).filter(Student.batch_id == batch_id).order_by(Student.roll_number).all()

    items = [_serialize_project_student(s) for s in students]
    assigned = len([s for s in items if s.project_status != "NOT_ASSIGNED" and s.project_title])
    submitted = len([s for s in items if s.project_url])

    return ProjectBatchResponse(
        batch_id=batch.id,
        batch_name=batch.name,
        total_students=len(items),
        assigned_count=assigned,
        submitted_count=submitted,
        students=items,
    )


@router.post("/batch/{batch_id}/assign", summary="Mentor Assign Project Idea to Batch Students")
def assign_project_to_batch(
    batch_id: str,
    payload: ProjectBatchAssignPayload,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN"])),
    db: Session = Depends(get_db),
):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    query = db.query(Student).filter(Student.batch_id == batch_id)
    if payload.student_ids:
        query = query.filter(Student.id.in_(payload.student_ids))

    students = query.all()
    if not students:
        raise HTTPException(status_code=400, detail="No matching students found in this batch to assign project to.")

    now = datetime.utcnow()
    for s in students:
        s.project_title = payload.project_title.strip()
        s.project_description = payload.project_description.strip()
        if not s.project_url:
            s.project_status = "ASSIGNED"
        s.project_assigned_at = now
        s.updated_at = now

        # Notify student
        create_notification(
            db=db,
            user_id=s.user_id,
            title="New Project Idea Assigned",
            message=f"Mentor {current_user.full_name} assigned project: '{payload.project_title}'. Check details in your dashboard.",
            notification_type="SYSTEM",
            link_url="/student",
        )

    db.commit()

    return {
        "status": "success",
        "message": f"Project idea '{payload.project_title}' assigned to {len(students)} trainees in batch {batch.name}.",
        "assigned_count": len(students),
    }


@router.put("/student/{student_id}", response_model=ProjectStudentItem, summary="Mentor Edit Individual Student Project")
def update_student_project(
    student_id: str,
    payload: ProjectStudentUpdatePayload,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    now = datetime.utcnow()
    if payload.project_title is not None:
        student.project_title = payload.project_title.strip()
    if payload.project_description is not None:
        student.project_description = payload.project_description.strip()
    if payload.project_status is not None:
        student.project_status = payload.project_status
    if payload.project_url is not None:
        student.project_url = payload.project_url.strip()
        if payload.project_url:
            student.project_submitted_at = now
            student.project_status = "SUBMITTED"

    student.updated_at = now
    db.commit()
    db.refresh(student)

    # Notify student about customized project update
    create_notification(
        db=db,
        user_id=student.user_id,
        title="Project Assignment Updated",
        message=f"Your project assignment has been updated by mentor {current_user.full_name}.",
        notification_type="SYSTEM",
        link_url="/student",
    )

    return _serialize_project_student(student)


@router.get("/my-project", response_model=ProjectStudentItem, summary="Student View Assigned Project Details")
def get_my_project(
    current_user: User = Depends(require_role(["STUDENT"])),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    return _serialize_project_student(student)


@router.put("/my-project/submit", response_model=ProjectStudentItem, summary="Student Submit Project URL")
def submit_my_project_url(
    payload: StudentProjectSubmitPayload,
    current_user: User = Depends(require_role(["STUDENT"])),
    db: Session = Depends(get_db),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    now = datetime.utcnow()
    student.project_url = payload.project_url.strip()
    student.project_submitted_at = now
    student.project_status = "SUBMITTED"
    student.updated_at = now

    db.commit()
    db.refresh(student)

    # Notify assigned mentor or batch mentor
    mentor_id = student.mentor_id
    if not mentor_id and student.batch:
        mentor_id = student.batch.mentor_id

    s_name = current_user.full_name
    if mentor_id:
        create_notification(
            db=db,
            user_id=mentor_id,
            title=f"Project URL Submitted: {s_name}",
            message=f"{s_name} ({student.roll_number}) submitted their capstone project URL: {payload.project_url}. Automatically synchronized to scoresheet.",
            notification_type="SYSTEM",
            link_url="/mentor/projects",
        )

    # Also notify HR
    create_notification(
        db=db,
        title=f"Trainee Project Submitted: {s_name}",
        message=f"{s_name} ({student.roll_number}) submitted project URL. Visible in scoresheet and trainee profile.",
        notification_type="SYSTEM",
        target_role="HR",
        link_url="/hr/students",
    )

    return _serialize_project_student(student)
