from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class CalendarEventBase(BaseModel):
    title: str = Field(..., min_length=1, description="Event or festival title")
    description: Optional[str] = None
    date: dt_date = Field(..., description="Date of the event / holiday / birthday")
    event_type: str = Field("EVENT", description="'FESTIVAL', 'OFF_DAY', 'BIRTHDAY', 'EVENT', 'BROADCAST'")
    is_off_day: bool = Field(False, description="Whether this is a non-working / holiday off day")
    person_name: Optional[str] = Field(None, description="Person name for birthdays")
    student_id: Optional[str] = Field(None, description="Linked student ID for birthdays")
    batch_id: Optional[str] = Field(None, description="Target batch ID for batch-specific broadcasts")
    target_scope: Optional[str] = Field("ALL", description="'ALL' or 'SPECIFIC_BATCH'")
    start_time: Optional[dt_datetime] = Field(None, description="Scheduled start datetime")
    end_time: Optional[dt_datetime] = Field(None, description="Expiration datetime")
    duration_minutes: Optional[int] = Field(None, description="Display duration in minutes")
    is_recurring: Optional[bool] = Field(False, description="Whether event recurs at fixed times")
    recurrence_pattern: Optional[str] = Field(None, description="'NONE', 'DAILY', 'WEEKLY'")

class CalendarEventCreate(CalendarEventBase):
    pass

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[dt_date] = None
    event_type: Optional[str] = None
    is_off_day: Optional[bool] = None
    person_name: Optional[str] = None
    student_id: Optional[str] = None
    batch_id: Optional[str] = None
    target_scope: Optional[str] = None
    start_time: Optional[dt_datetime] = None
    end_time: Optional[dt_datetime] = None
    duration_minutes: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None

class CalendarEventResponse(CalendarEventBase):
    id: str
    batch_name: Optional[str] = None
    is_active_broadcast: Optional[bool] = None
    created_by: Optional[str] = None
    created_at: dt_datetime
    updated_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)
