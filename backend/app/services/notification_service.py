import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.all_models import Notification

def create_notification(
    db: Session,
    title: str,
    message: str,
    notification_type: str = "GENERAL",
    user_id: Optional[str] = None,
    target_role: Optional[str] = None,
    link_url: Optional[str] = None
) -> Notification:
    """
    Creates and stores a persistent in-app notification in the database.
    Can be targeted to a specific user_id or broadcast to an entire target_role ('STUDENT', 'HR', etc.).
    """
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        target_role=target_role,
        title=title,
        message=message,
        notification_type=notification_type,
        link_url=link_url,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    try:
        db.commit()
        db.refresh(notif)
    except Exception as e:
        db.rollback()
        print(f"Failed to create notification: {e}")
    return notif
