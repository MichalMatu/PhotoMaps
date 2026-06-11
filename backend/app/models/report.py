from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class Report(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    target_type: str = Field(index=True)
    target_id: str = Field(index=True)
    reason: str
    message: str | None = None
    status: str = Field(default="open", index=True)
    created_at: datetime = Field(default_factory=utc_now)
