from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_staff, require_hr, verify_student_access, require_role
from app.models.all_models import User, Student
from app.schemas.all_schemas import (
    StudentResponse, StudentCreate, StudentUpdate, MentorAssignmentPayload,
    StudentStatusPayload, PaginatedStudentList
)
from app.services.base_services import StudentService

router = APIRouter(prefix="/students", tags=["Students"])

@router.get("/me", response_model=StudentResponse)
def get_my_student_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the authenticated student's own profile record.
    """
    if current_user.role != "STUDENT" and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not a student identity."
        )

    service = StudentService(db)
    student = service.get_by_user_id(current_user.id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for current user."
        )
    return student

@router.get("", response_model=PaginatedStudentList)
def list_students(
    search: Optional[str] = Query(None, description="Search by roll number, name, email, college, qualification"),
    program_id: Optional[str] = Query(None, description="Filter by program_id"),
    batch_id: Optional[str] = Query(None, description="Filter by batch_id"),
    mentor_id: Optional[str] = Query(None, description="Filter by mentor_id"),
    status: Optional[str] = Query(None, description="Filter by enrollment_status"),
    batch_type: Optional[str] = Query(None, description="Filter by batch_type (TECH_MASTER, SHORT_DURATION, INTERNSHIP)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    List student roster with server-side search & filtering.
    Restricted to MENTOR, HR, and SUPER_ADMIN.
    Mentors are automatically restricted to their assigned students.
    """
    effective_mentor_id = mentor_id
    if current_user.role == "MENTOR":
        effective_mentor_id = current_user.id

    service = StudentService(db)
    items, total = service.list_students(
        search=search,
        program_id=program_id,
        batch_id=batch_id,
        mentor_id=effective_mentor_id,
        status_filter=status,
        batch_type=batch_type,
        skip=skip,
        limit=limit
    )

    return PaginatedStudentList(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed student profile with isolation checks:
    - STUDENT role can ONLY view their own record.
    - MENTOR role can ONLY view students assigned to their batch.
    """
    student = verify_student_access(current_user, student_id, db)
    return student

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Create/Register a new student enrollment record. HR and Super Admin only.
    Validates user, program, batch consistency, and mentor role.
    """
    service = StudentService(db)
    return service.create_student(data, actor_id=current_user.id)

@router.put("/{student_id}", response_model=StudentResponse)
@router.patch("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    data: StudentUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Update student profile details. HR and Super Admin only.
    """
    service = StudentService(db)
    return service.update_student(student_id, data, actor_id=current_user.id)

@router.patch("/{student_id}/mentor", response_model=StudentResponse)
def assign_mentor(
    student_id: str,
    payload: MentorAssignmentPayload,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Assign or change mentor for a student. HR and Super Admin only.
    Validates mentor user exists and has MENTOR role.
    """
    service = StudentService(db)
    return service.assign_mentor(student_id, payload.mentor_id, actor_id=current_user.id)

@router.patch("/{student_id}/status", response_model=StudentResponse)
def update_status(
    student_id: str,
    payload: StudentStatusPayload,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Update student lifecycle enrollment status (e.g. ACTIVE, COMPLETED, DROPPED).
    HR and Super Admin only.
    """
    service = StudentService(db)
    return service.update_status(student_id, payload.status, reason=payload.reason, actor_id=current_user.id)

@router.delete("/{student_id}", status_code=status.HTTP_200_OK)
def delete_student(
    student_id: str,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Remove/delete a student from the system. Restricted to HR and SUPER_ADMIN.
    """
    service = StudentService(db)
    return service.delete_student(student_id, actor_id=current_user.id)


class CVUploadRequest(BaseModel):
    cv_url: str
    cv_file_name: Optional[str] = "Student_Resume.pdf"


@router.post("/me/cv", response_model=StudentResponse, summary="Student Upload or Update Resume/CV")
def upload_my_cv(
    payload: CVUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Student uploads or updates their CV document in their profile.
    Available to HR, Mentors, and Super Admins.
    """
    from datetime import datetime
    from app.api_routes.notifications import create_notification

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found."
        )

    student.cv_url = payload.cv_url.strip()
    student.cv_file_name = payload.cv_file_name.strip() if payload.cv_file_name else "Student_Resume.pdf"
    student.cv_updated_at = datetime.utcnow()
    student.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(student)

    # Notify Mentor and HR
    s_name = current_user.full_name
    mentor_id = student.mentor_id or (student.batch.mentor_id if student.batch else None)
    if mentor_id:
        create_notification(
            db=db,
            user_id=mentor_id,
            title=f"CV Uploaded: {s_name}",
            message=f"{s_name} ({student.roll_number}) uploaded their updated CV / Resume.",
            notification_type="SYSTEM",
            link_url="/mentor/students",
        )

    create_notification(
        db=db,
        title=f"Student CV Updated: {s_name}",
        message=f"{s_name} ({student.roll_number}) updated their Resume / CV document.",
        notification_type="SYSTEM",
        target_role="HR",
        link_url=f"/hr/students/{student.id}",
    )

    return student


class ReleaseCertificatePayload(BaseModel):
    approve: bool = True


@router.put("/{student_id}/release-certificate", response_model=StudentResponse, summary="Mentor Release/Lock Certificate Approval")
def release_student_certificate(
    student_id: str,
    payload: ReleaseCertificatePayload,
    current_user: User = Depends(require_role(["MENTOR", "SUPER_ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    """
    Mentor officially clicks 'Release Certificate' after training completion.
    This unlocks certificate creation in the HR management portal.
    """
    from datetime import datetime
    from app.services.notification_service import create_notification

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found."
        )

    student.certificate_approved_by_mentor = payload.approve
    student.certificate_approved_at = datetime.utcnow() if payload.approve else None
    student.certificate_approved_by = current_user.id if payload.approve else None
    student.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(student)

    if payload.approve:
        s_name = student.user.full_name if student.user else student.roll_number
        b_name = student.batch.name if student.batch else "Training Batch"
        create_notification(
            db=db,
            title=f"Certificate Release Approved: {s_name}",
            message=f"Mentor {current_user.full_name} has officially released certificate for {s_name} ({student.roll_number}) in {b_name}. HR can now issue the certificate.",
            notification_type="CERTIFICATE",
            target_role="HR",
            link_url="/hr/certificates",
        )
        if student.user_id:
            create_notification(
                db=db,
                user_id=student.user_id,
                title="Training Completion Certificate Released!",
                message=f"Congratulations! Your mentor {current_user.full_name} has released your certificate of completion.",
                notification_type="CERTIFICATE",
                link_url="/student",
            )

    return student
