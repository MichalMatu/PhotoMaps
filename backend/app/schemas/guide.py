from datetime import datetime

from sqlmodel import SQLModel

from app.schemas.photo import PhotoRead


class GuidePlacePreviewRead(SQLModel):
    id: str
    slug: str
    title: str
    description: str | None
    local_comment: str | None
    status: str
    photo_count: int
    memory_count: int
    cover_photo: PhotoRead | None


class GuideBase(SQLModel):
    slug: str
    title: str
    description: str | None = None
    status: str = "draft"


class GuideCreate(GuideBase):
    pass


class GuideUpdate(SQLModel):
    slug: str | None = None
    title: str | None = None
    description: str | None = None
    status: str | None = None


class GuideRead(SQLModel):
    id: str
    slug: str
    title: str
    description: str | None
    status: str
    place_count: int
    cover_photo: PhotoRead | None
    preview_places: list[GuidePlacePreviewRead]
    created_at: datetime
    updated_at: datetime


class GuideDetailRead(GuideRead):
    places: list[GuidePlacePreviewRead]


class GuidePlaceCreate(SQLModel):
    place_id: str
    sort_order: int = 0
