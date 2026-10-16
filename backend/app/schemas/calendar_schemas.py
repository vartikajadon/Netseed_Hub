from datetime import date as dt_date, datetime as dt_datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class CalendarEventBase(BaseModel):
    title: str = Field(..., min_length=1, description="Event or festival title")
    description: Optional[str] = None
    date: dt_date = Field(..., description="Date of the event / holiday / birthday")
    event_type: str = Field("EVENT", description="'FESTIVAL', 'OFF_DAY', 'BIRTHDAY', 'EVENT'")
    is_off_day: bool = Field(False, description="Whether this is a non-working / holiday off day")
    person_name: Optional[str] = Field(None, description="Person name for birthdays")
    student_id: Optional[str] = Field(None, description="Linked student ID for birthdays")

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

class CalendarEventResponse(CalendarEventBase):
    id: str
    created_by: Optional[str] = None
    created_at: dt_datetime
    updated_at: dt_datetime

    model_config = ConfigDict(from_attributes=True)
