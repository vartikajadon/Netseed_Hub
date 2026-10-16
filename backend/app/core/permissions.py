from typing import List, Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.models.all_models import User, Student, Batch
from app.database.session import get_db

class RoleChecker:
    """
    FastAPI dependency enforcing Server-Side Role-Based Access Control (RBAC).
    Verifies that the authenticated user possesses one of the allowed system roles.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role in {self.allowed_roles}, but your role is '{current_user.role}'."
            )
        return current_user

# Pre-defined reusable role checkers
require_student = RoleChecker(["STUDENT"])
require_mentor = RoleChecker(["MENTOR"])
require_hr = RoleChecker(["HR", "SUPER_ADMIN"])
require_super_admin = RoleChecker(["SUPER_ADMIN"])
require_staff = RoleChecker(["MENTOR", "HR", "SUPER_ADMIN"])

def require_role(allowed_roles: List[str]):
    return RoleChecker(allowed_roles)

def verify_student_access(current_user: User, student_id_or_user_id: str, db: Session) -> Student:
    """
    Enforces strict data isolation:
    1. STUDENT can ONLY access their own student record.
    2. MENTOR can ONLY access students assigned to them or in their batch.
    3. HR and SUPER_ADMIN have global access.
    """
    # Query student record by student_id or user_id
    student = db.query(Student).filter(
        (Student.id == student_id_or_user_id) | (Student.user_id == student_id_or_user_id)
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student record '{student_id_or_user_id}' not found."
        )

    # 1. Student self-isolation check
    if current_user.role == "STUDENT":
        if student.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Students are not permitted to access other students' private records."
            )

    # 2. Mentor scope isolation check
    elif current_user.role == "MENTOR":
        is_assigned_mentor = (student.mentor_id == current_user.id)
        if not is_assigned_mentor and student.batch_id:
            batch = db.query(Batch).filter(Batch.id == student.batch_id).first()
            if batch and batch.mentor_id == current_user.id:
                is_assigned_mentor = True

        if not is_assigned_mentor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Mentors can only access data for students assigned to their batches."
            )

    return student
