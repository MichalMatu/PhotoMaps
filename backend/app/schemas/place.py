from datetime import datetime

from sqlmodel import Field, SQLModel

from app.schemas.category import CategoryRead
from app.schemas.city import CityRead
from app.schemas.photo import PhotoRead


class PlaceBase(SQLModel):
    city_id: str
    slug: str
    title: str
    description: str | None = None
    local_comment: str | None = None
    category_ids: list[str] = Field(default_factory=list)
    lat: float
    lon: float
    weight: float = 1.0
    status: str = "draft"


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(SQLModel):
    city_id: str | None = None
    slug: str | None = None
    title: str | None = None
    description: str | None = None
    local_comment: str | None = None
    category_ids: list[str] | None = None
    lat: float | None = None
    lon: float | None = None
    weight: float | None = None
    status: str | None = None
    cover_photo_id: str | None = None


class PlaceRead(SQLModel):
    id: str
    city_id: str
    slug: str
    title: str
    description: str | None
    local_comment: str | None
    category_ids: list[str]
    lat: float
    lon: float
    weight: float
    status: str
    photo_count: int
    memory_count: int
    cover_photo_id: str | None
    score: float
    created_at: datetime
    updated_at: datetime


class PlaceMapPreviewItem(SQLModel):
    id: str
    kind: str
    place_id: str
    public_path: str
    thumb_path: str
    role: str | None = None
    source: str | None = None
    caption: str | None
    created_at: datetime
    approved_at: datetime | None


class PlaceMapRead(PlaceRead):
    city: CityRead
    categories: list[CategoryRead]
    cover_photo: PhotoRead | None
    preview_items: list[PlaceMapPreviewItem]
