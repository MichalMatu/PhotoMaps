from datetime import datetime

from sqlmodel import Field, SQLModel

from app.schemas.audio import AudioAttachment
from app.schemas.content import ContentBlock
from app.schemas.contract_types import PhotoRole, PhotoSource, ReviewFinalStatus, ReviewStatus


class PhotoRead(SQLModel):
    id: str
    place_id: str
    public_path: str
    thumb_path: str
    caption: str | None
    attribution_author: str | None
    attribution_source_url: str | None
    attribution_license: str | None
    attribution_license_url: str | None
    audio: AudioAttachment | None


class PhotoDetailRead(PhotoRead):
    description_blocks: list[ContentBlock]


class PhotoAdminRead(SQLModel):
    id: str
    place_id: str
    public_path: str | None
    thumb_path: str | None
    admin_public_path: str
    admin_thumb_path: str
    caption: str | None
    description_blocks: list[ContentBlock]
    attribution_author: str | None
    attribution_source_url: str | None
    attribution_license: str | None
    attribution_license_url: str | None
    audio: AudioAttachment | None
    admin_audio: AudioAttachment | None
    role: PhotoRole
    source: PhotoSource
    status: ReviewStatus
    consent_confirmed: bool
    created_at: datetime
    approved_at: datetime | None


class PhotoAdminAlbumRead(SQLModel):
    place_id: str
    photo_count: int
    cover_photo: PhotoAdminRead


class PhotoReview(SQLModel):
    status: ReviewFinalStatus


class PhotoUpdate(SQLModel):
    caption: str | None = Field(default=None, max_length=120)
    description_blocks: list[ContentBlock] | None = None
    attribution_author: str | None = Field(default=None, max_length=120)
    attribution_source_url: str | None = Field(default=None, max_length=500)
    attribution_license: str | None = Field(default=None, max_length=120)
    attribution_license_url: str | None = Field(default=None, max_length=500)
