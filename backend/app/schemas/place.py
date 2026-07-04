from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import Field as PydanticField
from sqlmodel import Field, SQLModel

from app.schemas.audio import AudioAttachment
from app.schemas.category import CategoryRead
from app.schemas.city import CityRead
from app.schemas.content import ContentBlock
from app.schemas.contract_types import PhotoRole, PhotoSource, PlaceStatus


class PlaceBase(SQLModel):
    city_id: str
    slug: str
    title: str
    description: str | None = None
    local_comment: str | None = None
    article_blocks: list[ContentBlock] = Field(default_factory=list)
    category_ids: list[str] = Field(default_factory=list)
    lat: float
    lon: float
    weight: float = 1.0
    status: PlaceStatus = "draft"
    custom_fields: dict[str, Any] = Field(default_factory=dict)


class PlaceCreate(PlaceBase):
    pass


class PlaceUpdate(SQLModel):
    city_id: str | None = None
    slug: str | None = None
    title: str | None = None
    description: str | None = None
    local_comment: str | None = None
    article_blocks: list[ContentBlock] | None = None
    category_ids: list[str] | None = None
    lat: float | None = None
    lon: float | None = None
    weight: float | None = None
    status: PlaceStatus | None = None
    custom_fields: dict[str, Any] | None = None
    cover_photo_id: str | None = None


class PlaceRead(SQLModel):
    id: str
    city_id: str
    slug: str
    title: str
    description: str | None
    category_ids: list[str]
    lat: float
    lon: float
    weight: float
    custom_fields: dict[str, Any]
    photo_count: int
    memory_count: int
    cover_photo_id: str | None
    score: float
    created_at: datetime
    updated_at: datetime


class PlaceDetailRead(PlaceRead):
    article_blocks: list[ContentBlock]


class PlaceAdminRead(PlaceRead):
    local_comment: str | None
    status: PlaceStatus
    article_blocks: list[ContentBlock]


class PlaceMapPhotoRead(SQLModel):
    id: str
    place_id: str
    public_path: str
    thumb_path: str
    role: PhotoRole
    source: PhotoSource
    caption: str | None
    description_blocks: list[ContentBlock]
    attribution_author: str | None
    attribution_source_url: str | None
    attribution_license: str | None
    attribution_license_url: str | None
    audio: AudioAttachment | None
    created_at: datetime
    approved_at: datetime | None


class PlaceMapPhotoPreviewItem(PlaceMapPhotoRead):
    kind: Literal["photo"] = "photo"


class PlaceMapMemoryPreviewItem(SQLModel):
    id: str
    kind: Literal["memory"] = "memory"
    place_id: str
    public_path: str
    thumb_path: str
    caption: str | None
    audio: AudioAttachment | None
    created_at: datetime
    approved_at: datetime | None


PlaceMapPreviewItem = Annotated[
    PlaceMapPhotoPreviewItem | PlaceMapMemoryPreviewItem,
    PydanticField(discriminator="kind"),
]


class PlaceMapRead(SQLModel):
    id: str
    city_id: str
    slug: str
    title: str
    description: str | None
    category_ids: list[str]
    lat: float
    lon: float
    weight: float
    custom_fields: dict[str, Any]
    photo_count: int
    memory_count: int
    score: float
    city: CityRead
    categories: list[CategoryRead]
    cover_photo: PlaceMapPhotoRead | None
    preview_items: list[PlaceMapPreviewItem]
