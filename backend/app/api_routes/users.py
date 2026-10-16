from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_staff, require_hr, require_super_admin
from app.models.all_models import User
from app.schemas.all_schemas import UserResponse, UserCreate, UserUpdate, AuditLogResponse
from app.services.base_services import UserService

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    List registered platform users. Staff only (MENTOR, HR, SUPER_ADMIN).
    """
    service = UserService(db)
    return service.list_users(skip=skip, limit=limit)

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve platform audit log trail. SUPER_ADMIN ONLY.
    """
    service = UserService(db)
    return service.get_audit_logs(skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user profile. Self or Staff access only.
    """
    if current_user.role == "STUDENT" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Cannot view other users' accounts."
        )
    service = UserService(db)
    return service.get_user(user_id)

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    """
    Register a new platform user. HR and SUPER_ADMIN only.
    """
    service = UserService(db)
    return service.create_user(data, actor_id=current_user.id)

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile. Only SUPER_ADMIN can modify user role or is_active status.
    """
    if current_user.role != "SUPER_ADMIN":
        if current_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Cannot edit other users' profiles."
            )
        if data.role is not None and data.role != current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only Super Admins can alter role assignments."
            )

    service = UserService(db)
    return service.update_user(user_id, data, actor_id=current_user.id)
