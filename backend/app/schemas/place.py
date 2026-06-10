from datetime import datetime

from sqlmodel import SQLModel


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
    is_chain: bool = False


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
    is_chain: bool | None = None
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
    is_chain: bool
    photo_count: int
    memory_count: int
    cover_photo_id: str | None
    score: float
    created_at: datetime
    updated_at: datetime
