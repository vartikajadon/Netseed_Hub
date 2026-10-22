from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class TrainerFeedbackCreate(BaseModel):
    trainer_id: str
    batch_id: Optional[str] = None
    is_anonymous: bool = False

    # Categories with optional rating (1-5) and/or optional text comments
    technical_rating: Optional[int] = Field(None, ge=1, le=5)
    technical_text: Optional[str] = None

    teaching_rating: Optional[int] = Field(None, ge=1, le=5)
    teaching_text: Optional[str] = None

    doubt_solving_rating: Optional[int] = Field(None, ge=1, le=5)
    doubt_solving_text: Optional[str] = None

    practical_guidance_rating: Optional[int] = Field(None, ge=1, le=5)
    practical_guidance_text: Optional[str] = None

    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_text: Optional[str] = None

    # General optional text feedback
    overall_feedback_text: Optional[str] = None

class TrainerFeedbackResponse(BaseModel):
    id: str
    student_id: Optional[str] = None
    student_name: str
    student_roll_no: Optional[str] = None
    trainer_id: str
    trainer_name: str
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    is_anonymous: bool

    technical_rating: Optional[int] = None
    technical_text: Optional[str] = None

    teaching_rating: Optional[int] = None
    teaching_text: Optional[str] = None

    doubt_solving_rating: Optional[int] = None
    doubt_solving_text: Optional[str] = None

    practical_guidance_rating: Optional[int] = None
    practical_guidance_text: Optional[str] = None

    communication_rating: Optional[int] = None
    communication_text: Optional[str] = None

    overall_feedback_text: Optional[str] = None
    average_rating: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class TrainerOptionItem(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
