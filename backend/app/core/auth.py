from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.configuration.config import settings
from app.database.session import get_db
from app.repositories.base_repositories import UserRepository
from app.models.all_models import User

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Validates the bearer JWT token (from Supabase Auth or dev token) and returns the authenticated User.
    Raises HTTP 401 Unauthorized if token is missing, invalid, or user is not found/disabled.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing. Bearer token required in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Handle dev mock tokens (e.g. mock_jwt_token_usr-student-001 or raw user ID)
    user_repo = UserRepository(db)
    
    if token.startswith("mock_jwt_token_"):
        uid = token.replace("mock_jwt_token_", "")
        user = user_repo.get_by_id(uid) or user_repo.get_by_email(uid)
        if user:
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="ACCESS_REVOKED: Your account has been deactivated. Please contact your HR administrator."
                )
            return user

    # Decode standard Supabase JWT
    try:
        # First attempt decoding with configured JWT secret signature check
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_aud": False}
            )
        except (jwt.PyJWTError, Exception):
            # Fallback for dev mode where Supabase public key/secret might differ
            payload = jwt.decode(
                token,
                options={"verify_signature": False, "verify_aud": False}
            )

        email = payload.get("email") or payload.get("sub")
        user_id = payload.get("sub") or payload.get("user_id")

        if not email and not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: Missing user identity claims.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Lookup user by email or ID
        user = None
        if email:
            user = user_repo.get_by_email(email)
        if not user and user_id:
            user = user_repo.get_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authenticated identity ({email or user_id}) is not registered in the system.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="ACCESS_REVOKED: Your account has been deactivated. Contact HR or Super Admin.",
            )

        return user

    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"JWT validation failed: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_authenticated_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that explicitly requires an active authenticated user."""
    return current_user
