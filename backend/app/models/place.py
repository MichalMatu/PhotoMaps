from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class Place(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    city_id: str = Field(foreign_key="city.id", index=True)
    slug: str = Field(index=True, unique=True)
    title: str
    description: str | None = None
    local_comment: str | None = None
    lat: float
    lon: float
    weight: float = 1.0
    status: str = Field(default="draft", index=True)
    photo_count: int = 0
    memory_count: int = 0
    cover_photo_id: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class PlaceCategory(SQLModel, table=True):
    __tablename__ = "place_category"

    place_id: str = Field(foreign_key="place.id", primary_key=True)
    category_id: str = Field(foreign_key="category.id", primary_key=True)
    sort_order: int = 0
