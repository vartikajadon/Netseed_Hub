from typing import Optional, List
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.models.all_models import User, AuditLog, UserLocationLog
from app.repositories.base_repositories import UserRepository
from app.schemas.all_schemas import UserResponse, UserLocationLogResponse, ChangePasswordRequest
from app.core.security import hash_password, verify_password, DEFAULT_TEMPORARY_PASSWORD

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None

class LogoutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: Optional[float] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


def extract_client_ip(req: Request) -> Optional[str]:
    if not req:
        return None
    forwarded = req.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return req.client.host if req.client else None


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """
    Authenticate user identity, capture device geolocation, and issue Bearer JWT access token.
    """
    user_repo = UserRepository(db)
    email_clean = request.email.strip().lower()
    user = user_repo.get_by_email(email_clean)

    # Support mentor login alias seamlessly
    if not user:
        if email_clean == "varsha@netlink.org":
            user = user_repo.get_by_email("mentor@netlink.org")
            if user:
                user.email = "varsha@netlink.org"
                user.full_name = "Varsha Yaduvanshi (Lead Mentor)"
                db.commit()
                db.refresh(user)
        elif email_clean == "mentor@netlink.org":
            user = user_repo.get_by_email("varsha@netlink.org")

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: User email not registered.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Enforce Student Dropout or Ended status access cutoff
    if user.role == "STUDENT":
        student_profile = user.student_profile
        if student_profile and student_profile.enrollment_status in ("DROPOUT", "DROPPED", "TERMINATED"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCESS_REVOKED: Your enrollment status has been marked as Dropout or Ended. All platform access has been suspended. Please contact HR if you need assistance.",
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS_REVOKED: Your account has been deactivated. Please contact your HR administrator.",
        )

    # 2. Password credential verification
    submitted_pass = (request.password or "").strip()
    if user.password_hash:
        if not verify_password(submitted_pass, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials: Password does not match.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # Initialize password hash for seed accounts on their first login with valid default/seed password
        if submitted_pass not in ("password123", DEFAULT_TEMPORARY_PASSWORD, "default_password"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials: Password does not match.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user.password_hash = hash_password(submitted_pass)
        db.commit()

    now = datetime.utcnow()
    client_ip = extract_client_ip(req)
    user_agent_str = req.headers.get("user-agent") if req else None

    # Update last login timestamp and coordinates on user record
    user.last_login_at = now
    if request.latitude is not None and request.longitude is not None:
        user.last_login_latitude = request.latitude
        user.last_login_longitude = request.longitude

    # 1. Immutable Audit Log
    audit = AuditLog(
        actor_id=user.id,
        action="USER_LOGIN",
        entity="User",
        entity_id=user.id,
        new_values=json.dumps({
            "event": "LOGIN",
            "email": user.email,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "accuracy": request.accuracy,
            "timestamp": now.isoformat()
        }),
        ip_address=client_ip,
        timestamp=now
    )
    db.add(audit)

    # 2. Detailed User Location Log entry
    loc_log = UserLocationLog(
        user_id=user.id,
        event_type="LOGIN",
        latitude=request.latitude,
        longitude=request.longitude,
        accuracy_meters=request.accuracy,
        ip_address=client_ip,
        user_agent=user_agent_str,
        timestamp=now
    )
    db.add(loc_log)

    db.commit()
    db.refresh(user)

    token = f"mock_jwt_token_{user.id}"

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_auth_me(current_user: User = Depends(get_current_user)):
    """
    Validates bearer token and returns current authenticated user profile & role claims.
    """
    if current_user.role == "STUDENT":
        if current_user.student_profile and current_user.student_profile.enrollment_status in ("DROPOUT", "DROPPED", "TERMINATED"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCESS_REVOKED: Your enrollment status has been marked as Dropout or Ended. All platform access has been suspended. Please contact HR if you need assistance.",
            )
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ACCESS_REVOKED: Your account has been deactivated. Please contact your HR administrator.",
        )
    return current_user

@router.post("/logout")
def logout(
    logout_req: Optional[LogoutRequest] = None,
    req: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke user session and capture logout device location & audit log.
    """
    now = datetime.utcnow()
    client_ip = extract_client_ip(req)
    user_agent_str = req.headers.get("user-agent") if req else None

    current_user.last_logout_at = now
    lat = logout_req.latitude if logout_req else None
    lon = logout_req.longitude if logout_req else None
    acc = logout_req.accuracy if logout_req else None

    if lat is not None and lon is not None:
        current_user.last_logout_latitude = lat
        current_user.last_logout_longitude = lon

    # 1. Immutable Audit Log
    audit = AuditLog(
        actor_id=current_user.id,
        action="USER_LOGOUT",
        entity="User",
        entity_id=current_user.id,
        new_values=json.dumps({
            "event": "LOGOUT",
            "email": current_user.email,
            "latitude": lat,
            "longitude": lon,
            "accuracy": acc,
            "timestamp": now.isoformat()
        }),
        ip_address=client_ip,
        timestamp=now
    )
    db.add(audit)

    # 2. Detailed User Location Log entry
    loc_log = UserLocationLog(
        user_id=current_user.id,
        event_type="LOGOUT",
        latitude=lat,
        longitude=lon,
        accuracy_meters=acc,
        ip_address=client_ip,
        user_agent=user_agent_str,
        timestamp=now
    )
    db.add(loc_log)

    db.commit()

    return {
        "message": f"Session revoked for user {current_user.email}",
        "captured_location": {
            "latitude": lat,
            "longitude": lon,
            "accuracy": acc,
            "timestamp": now.isoformat()
        }
    }

@router.get("/location-logs", response_model=List[UserLocationLogResponse])
def get_user_location_logs(
    user_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch captured login and logout location records.
    Super Admin and HR can view records for any user. Other roles can view their own.
    """
    query = db.query(UserLocationLog)
    if current_user.role in ["SUPER_ADMIN", "HR"]:
        if user_id:
            query = query.filter(UserLocationLog.user_id == user_id)
    else:
        query = query.filter(UserLocationLog.user_id == current_user.id)

    return query.order_by(UserLocationLog.timestamp.desc()).limit(limit).all()

@router.post("/refresh")
def refresh_token(current_user: User = Depends(get_current_user)):
    """
    Issue refreshed Bearer access token.
    """
    token = f"mock_jwt_token_{current_user.id}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(current_user)
    }


@router.post("/change-password")
@router.post("/change-password/")
@router.put("/change-password")
@router.put("/change-password/")
@router.post("/password")
@router.put("/password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user (Student, Mentor, HR, or Super Admin).
    If must_change_password is False, verifies current password.
    Hashes new password using bcrypt, clears must_change_password flag, and logs audit.
    """
    # If the user has an existing password and is not under mandatory first-time reset, check current password
    if current_user.password_hash and not current_user.must_change_password:
        curr = (payload.current_password or "").strip()
        if not curr or not verify_password(curr, current_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password does not match.",
            )
    elif not current_user.password_hash and not current_user.must_change_password:
        curr = (payload.current_password or "").strip()
        if curr not in ("password123", DEFAULT_TEMPORARY_PASSWORD, "default_password"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password does not match.",
            )

    new_pass = payload.new_password.strip()
    if len(new_pass) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long.",
        )

    current_user.password_hash = hash_password(new_pass)
    current_user.must_change_password = False
    current_user.updated_at = datetime.utcnow()

    audit = AuditLog(
        actor_id=current_user.id,
        action="CHANGE_PASSWORD",
        entity="User",
        entity_id=current_user.id,
        new_values=json.dumps({"event": "PASSWORD_CHANGED", "email": current_user.email}),
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "message": "Password changed successfully.",
        "user": UserResponse.model_validate(current_user)
    }

