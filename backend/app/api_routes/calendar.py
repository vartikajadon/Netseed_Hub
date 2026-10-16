import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import extract

from app.database.session import get_db
from app.core.permissions import get_current_user, require_role
from app.models.all_models import User, CalendarEvent, Student, Notification
from app.services.notification_service import create_notification
from app.schemas.calendar_schemas import (
    CalendarEventCreate, CalendarEventUpdate, CalendarEventResponse
)

router = APIRouter(prefix="/calendar", tags=["Calendar Events & Festivals"])


DEFAULT_CALENDAR_EVENTS = [
    # 1. Organization Birthday, Festivals & Milestones (Netlink branded)
    {
        "title": "Netlink Foundation Day & Global Anniversary",
        "description": "Celebrating 28+ years of digital transformation, engineering excellence, and innovation at Netlink & netSEED Hub! 🏆🎉",
        "date": date(2026, 1, 15),
        "event_type": "BIRTHDAY",
        "is_off_day": False,
        "person_name": "Netlink Software Group America Inc."
    },
    {
        "title": "Netlink Spring Innovation & Mentorship Summit",
        "description": "Annual Netlink tech showcase, mentor panels, and student talent exhibitions. 🚀",
        "date": date(2026, 4, 18),
        "event_type": "EVENT",
        "is_off_day": False,
        "person_name": "Netlink Software Group"
    },
    {
        "title": "Netlink Tech Synergy & Hackathon Festival",
        "description": "Flagship Netlink Technology Fest & AI hackathon uniting student cohorts and senior software engineers! 💻⚡",
        "date": date(2026, 10, 24),
        "event_type": "FESTIVAL",
        "is_off_day": False,
        "person_name": "Netlink Software Group"
    },
    {
        "title": "Netlink Grand Diwali Milan & Cultural Fest",
        "description": "Grand pre-Diwali cultural evening, festive dinner, and excellence awards at Netlink Campus! 🪔✨",
        "date": date(2026, 11, 6),
        "event_type": "FESTIVAL",
        "is_off_day": False,
        "person_name": "Netlink Software Group"
    },
    {
        "title": "Netlink Annual Awards & Founders Summit",
        "description": "Honoring outstanding trainees, graduation recognition, and year-end celebrations at Netlink. 🌟",
        "date": date(2026, 12, 18),
        "event_type": "EVENT",
        "is_off_day": False,
        "person_name": "Netlink Software Group"
    },
    # 2. National & Cultural Festivals / Off Days (2026)
    {
        "title": "New Year's Day",
        "description": "Global New Year celebration & official company holiday.",
        "date": date(2026, 1, 1),
        "event_type": "OFF_DAY",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Makar Sankranti & Pongal",
        "description": "Traditional harvest festival celebrated across India.",
        "date": date(2026, 1, 14),
        "event_type": "FESTIVAL",
        "is_off_day": False,
        "person_name": None
    },
    {
        "title": "Republic Day",
        "description": "77th Republic Day of India national holiday.",
        "date": date(2026, 1, 26),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Maha Shivratri",
        "description": "Auspicious Hindu festival & declared holiday.",
        "date": date(2026, 2, 15),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Holi (Festival of Colors)",
        "description": "Joyous festival of colors, spring renewal, and harmony.",
        "date": date(2026, 3, 3),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Eid ul-Fitr",
        "description": "Joyous celebration marking the conclusion of Ramadan.",
        "date": date(2026, 3, 20),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Ram Navami",
        "description": "Celebration of the birth of Lord Rama.",
        "date": date(2026, 3, 27),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Mahavir Jayanti",
        "description": "Jain festival honoring Lord Mahavira.",
        "date": date(2026, 3, 31),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Good Friday",
        "description": "Christian religious holiday and declared day off.",
        "date": date(2026, 4, 3),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Dr. B.R. Ambedkar Jayanti",
        "description": "Commemoration of the architect of the Indian Constitution.",
        "date": date(2026, 4, 14),
        "event_type": "OFF_DAY",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Labour Day / May Day",
        "description": "International Workers' Day holiday.",
        "date": date(2026, 5, 1),
        "event_type": "OFF_DAY",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Eid ul-Adha (Bakrid)",
        "description": "Islamic Feast of the Sacrifice holiday.",
        "date": date(2026, 5, 27),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Muharram",
        "description": "First month of the Islamic calendar holiday.",
        "date": date(2026, 6, 26),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Independence Day",
        "description": "National holiday commemorating Indian Independence.",
        "date": date(2026, 8, 15),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Raksha Bandhan",
        "description": "Festival celebrating brother-sister bond and solidarity.",
        "date": date(2026, 8, 28),
        "event_type": "FESTIVAL",
        "is_off_day": False,
        "person_name": None
    },
    {
        "title": "Janmashtami",
        "description": "Celebration of the birth of Lord Krishna.",
        "date": date(2026, 9, 4),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Ganesh Chaturthi",
        "description": "Festival welcoming Lord Ganesha with enthusiasm.",
        "date": date(2026, 9, 14),
        "event_type": "FESTIVAL",
        "is_off_day": False,
        "person_name": None
    },
    {
        "title": "Milad-un-Nabi",
        "description": "Prophet Muhammad's birthday commemoration.",
        "date": date(2026, 9, 25),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Mahatma Gandhi Jayanti",
        "description": "National holiday honoring the Father of the Nation.",
        "date": date(2026, 10, 2),
        "event_type": "OFF_DAY",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Dussehra / Vijayadashami",
        "description": "Triumph of righteousness over evil celebration.",
        "date": date(2026, 10, 20),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Diwali (Deepavali)",
        "description": "Grand festival of lights, prosperity, and joy.",
        "date": date(2026, 11, 8),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Govardhan Puja",
        "description": "Day following Diwali honoring nature and cattle.",
        "date": date(2026, 11, 9),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Bhai Dooj",
        "description": "Post-Diwali sibling blessing ceremony.",
        "date": date(2026, 11, 10),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Guru Nanak Jayanti",
        "description": "Gurpurab festival honoring the founder of Sikhism.",
        "date": date(2026, 11, 24),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    {
        "title": "Christmas Day",
        "description": "Global festival commemorating the birth of Jesus Christ.",
        "date": date(2026, 12, 25),
        "event_type": "FESTIVAL",
        "is_off_day": True,
        "person_name": None
    },
    # 3. Student & Staff Birthdays
    {
        "title": "Jane Smith's Birthday 🎂",
        "description": "Happy Birthday to trainee Jane Smith! Wishing you great success and growth at Netlink.",
        "date": date(2026, 2, 18),
        "event_type": "BIRTHDAY",
        "is_off_day": False,
        "person_name": "Jane Smith"
    },
    {
        "title": "John Doe's Birthday 🎂",
        "description": "Happy Birthday to trainee John Doe! Wishing you achievements in your career track.",
        "date": date(2026, 4, 12),
        "event_type": "BIRTHDAY",
        "is_off_day": False,
        "person_name": "John Doe"
    },
    {
        "title": "Alex Rivera's Birthday 🎂",
        "description": "Wishing Lead Mentor Alex Rivera a joyous birthday!",
        "date": date(2026, 6, 8),
        "event_type": "BIRTHDAY",
        "is_off_day": False,
        "person_name": "Alex Rivera"
    },
    {
        "title": "Prerna Verma's Birthday 🎂",
        "description": "Happy Birthday to HR Manager Prerna Verma! Thank you for supporting our trainees.",
        "date": date(2026, 8, 22),
        "event_type": "BIRTHDAY",
        "is_off_day": False,
        "person_name": "Prerna Verma"
    },
    {
        "title": "Rohan Gupta's Birthday 🎂",
        "description": "Wishing student Rohan Gupta a wonderful birthday celebration!",
        "date": date(2026, 10, 15),
        "event_type": "BIRTHDAY",
        "is_off_day": False,
        "person_name": "Rohan Gupta"
    },
    {
        "title": "Priya Sharma's Birthday 🎂",
        "description": "Happy Birthday to student Priya Sharma! Best wishes for your learning journey.",
        "date": date(2026, 11, 28),
        "event_type": "BIRTHDAY",
        "is_off_day": False,
        "person_name": "Priya Sharma"
    }
]


def ensure_default_calendar_seeded(db: Session):
    for item in DEFAULT_CALENDAR_EVENTS:
        existing = db.query(CalendarEvent).filter(CalendarEvent.title == item["title"]).first()
        if not existing:
            ev = CalendarEvent(
                id=str(uuid.uuid4()),
                title=item["title"],
                description=item["description"],
                date=item["date"],
                event_type=item["event_type"],
                is_off_day=item["is_off_day"],
                person_name=item["person_name"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(ev)
    
    # Auto-sync any registered student with a DOB into the calendar
    students_with_dob = db.query(Student).filter(Student.dob.isnot(None)).all()
    for s in students_with_dob:
        ev = db.query(CalendarEvent).filter(
            (CalendarEvent.student_id == s.id) |
            (CalendarEvent.description.like(f"%({s.roll_number})%"))
        ).first()
        user = s.user or db.query(User).filter(User.id == s.user_id).first()
        person_name = user.full_name if user else "Student"
        year = 2026
        month = s.dob.month
        day = s.dob.day
        try:
            b_date = date(year, month, day)
        except ValueError:
            b_date = date(year, 2, 28)

        title = f"{person_name}'s Birthday 🎂"
        description = f"Happy Birthday to trainee {person_name} ({s.roll_number})! Best wishes from Netlink & netSEED team."

        if not ev:
            new_ev = CalendarEvent(
                id=str(uuid.uuid4()),
                title=title,
                description=description,
                date=b_date,
                event_type="BIRTHDAY",
                is_off_day=False,
                person_name=person_name,
                student_id=s.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(new_ev)
        else:
            ev.title = title
            ev.description = description
            ev.date = b_date
            ev.person_name = person_name
            ev.student_id = s.id

    try:
        db.commit()
    except Exception:
        db.rollback()


@router.get("/birthday-reminders", summary="Get HR Birthday Reminders with 1-Day Prior Alert")
def get_birthday_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns upcoming student birthdays categorized for HR reminders:
    - one_day_before: students celebrating their birthday TOMORROW (1 day before)
    - today: students celebrating today
    - upcoming_7_days: birthdays within 7 days
    - upcoming_month: birthdays in the next 30 days
    Also triggers a persistent HR notification if tomorrow is a student's birthday.
    """
    ensure_default_calendar_seeded(db)

    # Current reference date (today)
    today = datetime.utcnow().date()
    tomorrow = today + timedelta(days=1)

    students = db.query(Student).filter(Student.dob.isnot(None)).all()

    one_day_before = []
    today_list = []
    upcoming_7_days = []
    upcoming_month = []

    for s in students:
        if not s.dob:
            continue
        user = s.user or db.query(User).filter(User.id == s.user_id).first()
        student_name = user.full_name if user else "Student"
        email = user.email if user else ""
        contact_number = s.contact_number or (user.phone if user else "")
        program_title = s.program.title if s.program else ""
        batch_name = s.batch.name if s.batch else ""

        try:
            b_date_this_year = date(today.year, s.dob.month, s.dob.day)
        except ValueError:
            b_date_this_year = date(today.year, 2, 28)

        if b_date_this_year < today:
            try:
                b_date = date(today.year + 1, s.dob.month, s.dob.day)
            except ValueError:
                b_date = date(today.year + 1, 2, 28)
        else:
            b_date = b_date_this_year

        days_until = (b_date - today).days
        turning_age = (b_date.year - s.dob.year) if s.dob.year else None

        item = {
            "student_id": s.id,
            "student_name": student_name,
            "roll_number": s.roll_number,
            "email": email,
            "contact_number": contact_number,
            "dob": s.dob.isoformat(),
            "celebration_date": b_date.isoformat(),
            "days_until": days_until,
            "turning_age": turning_age,
            "program_title": program_title,
            "batch_name": batch_name,
            "is_tomorrow": days_until == 1,
            "is_today": days_until == 0
        }

        if days_until == 1:
            one_day_before.append(item)
            # Create HR notification if not already created today
            existing_notif = db.query(Notification).filter(
                Notification.target_role == "HR",
                Notification.title.like(f"%Tomorrow is {student_name}'s Birthday%"),
                extract('year', Notification.created_at) == today.year,
                extract('month', Notification.created_at) == today.month,
                extract('day', Notification.created_at) == today.day
            ).first()
            if not existing_notif:
                create_notification(
                    db=db,
                    title=f"🎂 Tomorrow is {student_name}'s Birthday!",
                    message=f"Reminder (1 Day Before): Trainee {student_name} ({s.roll_number}) celebrates their birthday tomorrow on {b_date.strftime('%d %B')}! Don't forget to prepare wishes.",
                    notification_type="BIRTHDAY_REMINDER",
                    target_role="HR",
                    link_url="/calendar"
                )

        if days_until == 0:
            today_list.append(item)

        if 0 <= days_until <= 7:
            upcoming_7_days.append(item)

        if 0 <= days_until <= 30:
            upcoming_month.append(item)

    one_day_before.sort(key=lambda x: x["days_until"])
    today_list.sort(key=lambda x: x["days_until"])
    upcoming_7_days.sort(key=lambda x: x["days_until"])
    upcoming_month.sort(key=lambda x: x["days_until"])

    return {
        "today_count": len(today_list),
        "one_day_before_count": len(one_day_before),
        "one_day_before": one_day_before,
        "today": today_list,
        "upcoming_7_days": upcoming_7_days,
        "upcoming_month": upcoming_month
    }


@router.get("/events", response_model=List[CalendarEventResponse], summary="List Calendar Events, Festivals, Off-Days & Birthdays")
def list_calendar_events(
    year: Optional[int] = Query(None, description="Filter by year (e.g. 2026)"),
    month: Optional[int] = Query(None, description="Filter by month (1 to 12)"),
    event_type: Optional[str] = Query(None, description="'FESTIVAL', 'OFF_DAY', 'BIRTHDAY', 'EVENT'"),
    is_off_day: Optional[bool] = Query(None, description="Filter off days / holidays"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all calendar events, festivals, off-days, and birthdays.
    Available to all authenticated users (students, mentors, HR, admin).
    """
    ensure_default_calendar_seeded(db)

    q = db.query(CalendarEvent)
    if year:
        q = q.filter(extract('year', CalendarEvent.date) == year)
    if month:
        q = q.filter(extract('month', CalendarEvent.date) == month)
    if event_type:
        q = q.filter(CalendarEvent.event_type == event_type.upper())
    if is_off_day is not None:
        q = q.filter(CalendarEvent.is_off_day == is_off_day)

    events = q.order_by(CalendarEvent.date.asc(), CalendarEvent.title.asc()).all()
    return [CalendarEventResponse.model_validate(e) for e in events]


@router.post("/events", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED, summary="Create Calendar Event")
def create_calendar_event(
    payload: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    HR/Admin endpoint to create a calendar event, festival, company off-day, or birthday announcement.
    """
    event = CalendarEvent(
        id=str(uuid.uuid4()),
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        date=payload.date,
        event_type=payload.event_type.upper(),
        is_off_day=payload.is_off_day,
        person_name=payload.person_name.strip() if payload.person_name else None,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return CalendarEventResponse.model_validate(event)


@router.put("/events/{event_id}", response_model=CalendarEventResponse, summary="Update Calendar Event")
def update_calendar_event(
    event_id: str,
    payload: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Update an existing calendar event.
    """
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found.")

    if payload.title is not None:
        event.title = payload.title.strip()
    if payload.description is not None:
        event.description = payload.description.strip() if payload.description else None
    if payload.date is not None:
        event.date = payload.date
    if payload.event_type is not None:
        event.event_type = payload.event_type.upper()
    if payload.is_off_day is not None:
        event.is_off_day = payload.is_off_day
    if payload.person_name is not None:
        event.person_name = payload.person_name.strip() if payload.person_name else None

    event.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return CalendarEventResponse.model_validate(event)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete Calendar Event")
def delete_calendar_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Delete a calendar event.
    """
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found.")

    db.delete(event)
    db.commit()
    return None


@router.post("/reset-defaults", response_model=List[CalendarEventResponse], summary="Reset Default Festivals, Birthdays & Off-Days")
def reset_calendar_defaults(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["HR", "SUPER_ADMIN"]))
):
    """
    Resets / re-seeds full 2026/2027 calendar dataset with festivals, organization birthday, and student birthdays.
    """
    db.query(CalendarEvent).delete()
    for item in DEFAULT_CALENDAR_EVENTS:
        ev = CalendarEvent(
            id=str(uuid.uuid4()),
            title=item["title"],
            description=item["description"],
            date=item["date"],
            event_type=item["event_type"],
            is_off_day=item["is_off_day"],
            person_name=item["person_name"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(ev)
    db.commit()

    events = db.query(CalendarEvent).order_by(CalendarEvent.date.asc()).all()
    return [CalendarEventResponse.model_validate(e) for e in events]
