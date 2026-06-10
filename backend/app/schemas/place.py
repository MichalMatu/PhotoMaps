from datetime import datetime

from sqlmodel import SQLModel

from app.schemas.category import CategoryRead
from app.schemas.memory import MemoryRead
from app.schemas.photo import PhotoRead


class PlaceBase(SQLModel):
    slug: str
    title: str
    description: str | None = None
    local_comment: str | None = None
    category_id: str | None = None
    lat: float
    lon: float
    weight: float = 1.0
    status: str = "draft"


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(SQLModel):
    slug: str | None = None
    title: str | None = None
    description: str | None = None
    local_comment: str | None = None
    category_id: str | None = None
    lat: float | None = None
    lon: float | None = None
    weight: float | None = None
    status: str | None = None
    cover_photo_id: str | None = None


class PlaceRead(SQLModel):
    id: str
    slug: str
    title: str
    description: str | None
    local_comment: str | None
    category_id: str | None
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


class PlaceMapRead(PlaceRead):
    category: CategoryRead | None
    cover_photo: PhotoRead | None
    photos: list[PhotoRead]
    memories: list[MemoryRead]
