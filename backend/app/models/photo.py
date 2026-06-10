from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Photo(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    place_id: str = Field(foreign_key="place.id", index=True)
    original_path: str
    public_path: str
    thumb_path: str
    status: str = Field(default="pending", index=True)
    caption: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    approved_at: datetime | None = None
