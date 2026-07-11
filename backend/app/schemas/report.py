from datetime import datetime

from sqlmodel import Field, SQLModel

from app.schemas.contract_types import ReportReason, ReportStatus, ReportTargetType

MAX_REPORT_MESSAGE_LENGTH = 2000


class ReportCreate(SQLModel):
    target_type: ReportTargetType
    target_id: str
    reason: ReportReason
    message: str | None = Field(default=None, max_length=MAX_REPORT_MESSAGE_LENGTH)


class ReportUpdate(SQLModel):
    status: ReportStatus | None = None
    message: str | None = Field(default=None, max_length=MAX_REPORT_MESSAGE_LENGTH)


class ReportRead(SQLModel):
    id: str
    target_type: ReportTargetType
    target_id: str
    reason: ReportReason
    message: str | None
    status: ReportStatus
    created_at: datetime
