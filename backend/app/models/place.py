from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Place(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    description: str | None = None
    local_comment: str | None = None
    category_id: str | None = Field(default=None, foreign_key="category.id")
    lat: float
    lon: float
    weight: float = 1.0
    status: str = Field(default="draft", index=True)
    photo_count: int = 0
    memory_count: int = 0
    cover_photo_id: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
