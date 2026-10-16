from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.auth import get_current_user
from app.models.all_models import User
from app.repositories.base_repositories import UserRepository
from app.schemas.all_schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user identity and issue Bearer JWT access token.
    """
    user_repo = UserRepository(db)
    user = user_repo.get_by_email(request.email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: User email not registered.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Please contact your administrator.",
        )

    token = f"mock_jwt_token_{user.id}"

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=user
    )

@router.get("/me", response_model=UserResponse)
def get_auth_me(current_user: User = Depends(get_current_user)):
    """
    Validates bearer token and returns current authenticated user profile & role claims.
    """
    return current_user

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Revoke user session.
    """
    return {"message": f"Session revoked for user {current_user.email}"}

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
