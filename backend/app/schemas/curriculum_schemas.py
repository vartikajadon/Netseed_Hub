from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class TopicProgressUpdate(BaseModel):
    is_completed: bool
    batch_id: Optional[str] = None
    assessment_name: Optional[str] = None
    notes: Optional[str] = None


class TopicItemResponse(BaseModel):
    id: str
    program_id: str
    module_name: str
    title: str
    description: Optional[str] = None
    order_index: int
    is_completed: bool = False
    completed_at: Optional[datetime] = None
    completed_by_id: Optional[str] = None
    completed_by_name: Optional[str] = None
    assessment_name: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProgramCurriculumResponse(BaseModel):
    program_id: str
    program_title: str
    program_code: str
    batch_id: Optional[str] = None
    batch_name: Optional[str] = None
    total_topics: int
    completed_topics: int
    completion_percentage: float
    is_published: bool = True
    topics: List[TopicItemResponse]

    model_config = ConfigDict(from_attributes=True)


class CurriculumTopicCreate(BaseModel):
    module_name: str
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = 1


class CurriculumTopicUpdate(BaseModel):
    module_name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None


class CurriculumImportTopicPayload(BaseModel):
    module_name: str
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = None


class CurriculumImportRequest(BaseModel):
    topics: List[CurriculumImportTopicPayload]
    replace_existing: bool = False


class CurriculumPublishPayload(BaseModel):
    is_published: bool
