from datetime import datetime

from sqlmodel import SQLModel

from app.schemas.place import PlaceRead


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
    created_at: datetime
    updated_at: datetime


class GuideDetailRead(GuideRead):
    places: list[PlaceRead]


class GuidePlaceCreate(SQLModel):
    place_id: str
    sort_order: int = 0
