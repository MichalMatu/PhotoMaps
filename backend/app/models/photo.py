from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class Photo(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    place_id: str = Field(foreign_key="place.id", index=True)
    original_path: str
    public_path: str
    thumb_path: str
    role: str = Field(default="gallery", index=True)
    source: str = Field(default="user_upload", index=True)
    status: str = Field(default="pending", index=True)
    caption: str | None = None
    consent_confirmed: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    approved_at: datetime | None = None
