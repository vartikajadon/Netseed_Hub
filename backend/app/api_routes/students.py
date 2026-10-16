from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_staff, require_hr, verify_student_access
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
