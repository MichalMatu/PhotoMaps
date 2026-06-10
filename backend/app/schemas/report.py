from datetime import datetime

from sqlmodel import SQLModel


class ReportCreate(SQLModel):
    target_type: str
    target_id: str
    reason: str
    message: str | None = None


class ReportUpdate(SQLModel):
    status: str | None = None
    message: str | None = None


class ReportRead(SQLModel):
    id: str
    target_type: str
    target_id: str
    reason: str
    message: str | None
    status: str
    created_at: datetime
