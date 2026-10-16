from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.core.permissions import get_current_user
from app.models.all_models import User, Notification
from app.schemas.lifecycle_extensions_schemas import NotificationCreate, NotificationResponse
from app.services.notification_service import create_notification

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])

@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches in-app notifications for the current authenticated user,
    including direct notifications and role-broadcasted notifications.
    """
    query = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.target_role == current_user.role,
            Notification.target_role.is_(None)
        )
    )

    if unread_only:
        query = query.filter(Notification.is_read.is_(False))

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return notifications


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def trigger_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger in-app notification for task completion, acknowledgment, or alert.
    """
    notif = create_notification(
        db=db,
        title=payload.title,
        message=payload.message,
        notification_type=payload.notification_type,
        user_id=payload.user_id,
        target_role=payload.target_role,
        link_url=payload.link_url
    )
    return notif


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.target_role == current_user.role
        ),
        Notification.is_read.is_(False)
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "All notifications marked as read."}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    db.delete(notif)
    db.commit()
    return {"message": "Notification removed."}
