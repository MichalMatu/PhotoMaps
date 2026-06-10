from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Memory(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    place_id: str = Field(foreign_key="place.id", index=True)
    author_name: str | None = None
    author_city: str | None = None
    caption: str
    original_path: str
    public_path: str
    thumb_path: str
    status: str = Field(default="pending", index=True)
    paid: bool = False
    share_slug: str = Field(default_factory=lambda: uuid4().hex[:12], index=True, unique=True)
    consent_confirmed: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    approved_at: datetime | None = None
