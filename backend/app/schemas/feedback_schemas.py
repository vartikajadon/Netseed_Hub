from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional
from datetime import datetime

class FeedbackCreate(BaseModel):
    student_id: str
    technical_skills: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    task_performance: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    communication: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    punctuality_professionalism: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    learning_attitude: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: str = Field(..., min_length=2, max_length=2500, description="Constructive mentor feedback comment")

    @field_validator("comment")
    @classmethod
    def validate_comment_non_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Comment cannot be blank or contain only whitespace.")
        return stripped


class FeedbackResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    student_roll_number: Optional[str] = None
    mentor_id: str
    mentor_name: Optional[str] = None
    technical_skills: int
    task_performance: int
    communication: int
    punctuality_professionalism: int
    learning_attitude: int
    average_rating: float
    comment: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
