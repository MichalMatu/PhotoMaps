from datetime import datetime
from math import isfinite

from pydantic import field_validator
from sqlmodel import Field, SQLModel

from app.schemas.content import ContentBlock
from app.schemas.contract_types import GuideStatus, PlaceStatus
from app.schemas.photo import PhotoRead


class GuideRoutePoint(SQLModel):
    lat: float
    lon: float

    @field_validator("lat")
    @classmethod
    def validate_latitude(cls, value: float) -> float:
        if not isfinite(value) or value < -90 or value > 90:
            raise ValueError("Route point latitude must be between -90 and 90")
        return value

    @field_validator("lon")
    @classmethod
    def validate_longitude(cls, value: float) -> float:
        if not isfinite(value) or value < -180 or value > 180:
            raise ValueError("Route point longitude must be between -180 and 180")
        return value


class PublicGuidePlacePreviewRead(SQLModel):
    id: str
    city_id: str
    slug: str
    title: str
    description: str | None
    lat: float
    lon: float
    photo_count: int
    memory_count: int
    cover_photo: PhotoRead | None


class GuidePlacePreviewRead(PublicGuidePlacePreviewRead):
    local_comment: str | None
    status: PlaceStatus


class GuideBase(SQLModel):
    slug: str
    title: str
    description: str | None = None
    article_blocks: list[ContentBlock] = Field(default_factory=list)
    route_points: list[GuideRoutePoint] = Field(default_factory=list)
    status: GuideStatus = "draft"


class GuideCreate(GuideBase):
    pass


class GuideUpdate(SQLModel):
    slug: str | None = None
    title: str | None = None
    description: str | None = None
    article_blocks: list[ContentBlock] | None = None
    route_points: list[GuideRoutePoint] | None = None
    status: GuideStatus | None = None


class GuideRead(SQLModel):
    id: str
    slug: str
    title: str
    description: str | None
    article_blocks: list[ContentBlock]
    status: GuideStatus
    place_count: int
    cover_photo: PhotoRead | None
    preview_places: list[GuidePlacePreviewRead]
    route_points: list[GuideRoutePoint]
    created_at: datetime
    updated_at: datetime


class GuideDetailRead(GuideRead):
    places: list[GuidePlacePreviewRead]


class PublicGuideRead(SQLModel):
    id: str
    slug: str
    title: str
    description: str | None
    article_blocks: list[ContentBlock]
    place_count: int
    cover_photo: PhotoRead | None
    preview_places: list[PublicGuidePlacePreviewRead]
    route_points: list[GuideRoutePoint]


class PublicGuideDetailRead(PublicGuideRead):
    places: list[PublicGuidePlacePreviewRead]


class GuidePlaceCreate(SQLModel):
    place_id: str
    sort_order: int = 0


class GuidePlaceOrderItem(SQLModel):
    place_id: str
    sort_order: int = Field(ge=0)


class GuidePlaceOrderUpdate(SQLModel):
    places: list[GuidePlaceOrderItem]
