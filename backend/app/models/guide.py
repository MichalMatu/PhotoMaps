from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class Guide(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    slug: str = Field(index=True, unique=True)
    title: str
    description: str | None = None
    status: str = Field(default="draft", index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class PlaceGuide(SQLModel, table=True):
    __tablename__ = "place_guide"

    guide_id: str = Field(foreign_key="guide.id", primary_key=True)
    place_id: str = Field(foreign_key="place.id", primary_key=True)
    sort_order: int = 0
