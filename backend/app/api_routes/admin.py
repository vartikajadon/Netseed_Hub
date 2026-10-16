from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.permissions import require_super_admin
from app.models.all_models import User, AuditLog
from app.repositories.base_repositories import UserRepository, AuditLogRepository
from app.schemas.all_schemas import UserResponse, AuditLogResponse
from app.schemas.admin_dashboard_schemas import (
    AdminDashboardSummaryResponse,
    StudentOverviewResponse,
    ProgramBatchOverviewResponse,
    AttendanceOverviewResponse,
    TaskSkillOverviewResponse,
    CareerReadinessResponse,
    OutcomesResponse,
    SecurityAlertsResponse,
    RecentActivityResponse,
)
from app.services.admin_dashboard_service import AdminDashboardService

router = APIRouter(prefix="/admin", tags=["Super Admin"])


class RoleChangePayload(BaseModel):
    new_role: str


# --- EXISTING ADMIN USER & AUDIT ROUTES ---

@router.get("/users", response_model=List[UserResponse])
def admin_list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    List all platform users with system-wide metadata. Super Admin only.
    """
    user_repo = UserRepository(db)
    return user_repo.get_all(skip=skip, limit=limit)


@router.put("/users/{user_id}/role", response_model=UserResponse)
def admin_update_user_role(
    user_id: str,
    payload: RoleChangePayload,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Update a user's authorization role. Super Admin only. Generates audit log.
    """
    valid_roles = ["STUDENT", "MENTOR", "HR", "SUPER_ADMIN"]
    if payload.new_role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{payload.new_role}'. Must be one of {valid_roles}."
        )

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    old_role = user.role
    user.role = payload.new_role
    updated_user = user_repo.update(user)

    audit_repo = AuditLogRepository(db)
    audit_repo.create(AuditLog(
        actor_id=current_user.id,
        action="UPDATE_USER_ROLE",
        entity="User",
        entity_id=user.id,
        old_values=f"role={old_role}",
        new_values=f"role={user.role}"
    ))

    return updated_user


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def admin_get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Query system audit logs. Super Admin only.
    """
    audit_repo = AuditLogRepository(db)
    return audit_repo.get_all(skip=skip, limit=limit)


@router.get("/system")
def admin_system_status(current_user: User = Depends(require_super_admin)):
    """
    Get core platform diagnostic metrics. Super Admin only.
    """
    return {
        "status": "healthy",
        "database": "connected",
        "auth_provider": "Supabase Auth + FastAPI RBAC Guard",
        "rbac_enforcement": "ACTIVE"
    }


# --- SUPER ADMIN DASHBOARD ENDPOINTS ---

@router.get("/dashboard/summary", response_model=AdminDashboardSummaryResponse)
def get_dashboard_summary(
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Central operational summary statistics for the Super Admin executive view.
    """
    return AdminDashboardService.get_summary(db)


@router.get("/dashboard/students", response_model=StudentOverviewResponse)
def get_dashboard_students(
    program_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    mentor_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Student distribution and roster overview with filters.
    """
    return AdminDashboardService.get_student_overview(
        db=db,
        program_id=program_id,
        batch_id=batch_id,
        mentor_id=mentor_id,
        status_filter=status,
        skip=skip,
        limit=limit
    )


@router.get("/dashboard/programs", response_model=ProgramBatchOverviewResponse)
def get_dashboard_programs(
    program_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Program and batch hierarchical overview with attendance and readiness indicators.
    """
    return AdminDashboardService.get_programs_and_batches(
        db=db,
        program_id=program_id,
        is_active=is_active
    )


@router.get("/dashboard/attendance", response_model=AttendanceOverviewResponse)
def get_dashboard_attendance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    program_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Attendance analytics, threshold warnings, and daily trends.
    """
    return AdminDashboardService.get_attendance_overview(
        db=db,
        start_date=start_date,
        end_date=end_date,
        program_id=program_id,
        batch_id=batch_id
    )


@router.get("/dashboard/tasks", response_model=TaskSkillOverviewResponse)
def get_dashboard_tasks(
    program_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    mentor_id: Optional[str] = Query(None),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Task completion progress and performance indicators.
    """
    return AdminDashboardService.get_task_and_skill_progress(
        db=db,
        program_id=program_id,
        batch_id=batch_id,
        mentor_id=mentor_id
    )


@router.get("/dashboard/skills", response_model=TaskSkillOverviewResponse)
def get_dashboard_skills(
    program_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    mentor_id: Optional[str] = Query(None),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Skill distribution across Beginner, Intermediate, Proficient, and Expert tiers.
    """
    return AdminDashboardService.get_task_and_skill_progress(
        db=db,
        program_id=program_id,
        batch_id=batch_id,
        mentor_id=mentor_id
    )


@router.get("/dashboard/career-readiness", response_model=CareerReadinessResponse)
def get_dashboard_career_readiness(
    program_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None, description="READY, DEVELOPMENT, or NOT_READY"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Career readiness evaluation based on PRD weighted formula. Decision support only.
    """
    return AdminDashboardService.get_career_readiness(
        db=db,
        program_id=program_id,
        batch_id=batch_id,
        readiness_category=category,
        skip=skip,
        limit=limit
    )


@router.get("/dashboard/outcomes", response_model=OutcomesResponse)
def get_dashboard_outcomes(
    program_id: Optional[str] = Query(None),
    batch_id: Optional[str] = Query(None),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Internship and traineeship completion outcome distribution.
    """
    return AdminDashboardService.get_outcomes(
        db=db,
        program_id=program_id,
        batch_id=batch_id
    )


@router.get("/dashboard/security-alerts", response_model=SecurityAlertsResponse)
def get_dashboard_security_alerts(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Real-time security and fraud alert event tracking without exposing biometric templates.
    """
    return AdminDashboardService.get_security_alerts(db=db, limit=limit)


@router.get("/dashboard/recent-activity", response_model=RecentActivityResponse)
def get_dashboard_recent_activity(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Immutable administrative audit log activity stream.
    """
    return AdminDashboardService.get_recent_activity(db=db, skip=skip, limit=limit)
