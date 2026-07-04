from datetime import datetime

from sqlmodel import SQLModel

from app.schemas.contract_types import ReportReason, ReportStatus, ReportTargetType


class ReportCreate(SQLModel):
    target_type: ReportTargetType
    target_id: str
    reason: ReportReason
    message: str | None = None


class ReportUpdate(SQLModel):
    status: ReportStatus | None = None
    message: str | None = None


class ReportRead(SQLModel):
    id: str
    target_type: ReportTargetType
    target_id: str
    reason: ReportReason
    message: str | None
    status: ReportStatus
    created_at: datetime
