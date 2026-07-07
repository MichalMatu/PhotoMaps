from datetime import datetime

from sqlmodel import Field, SQLModel

from app.schemas.audio import AudioAttachment
from app.schemas.contract_types import ReviewFinalStatus, ReviewStatus


class MemoryRead(SQLModel):
    id: str
    place_id: str
    author_name: str | None
    author_city: str | None
    caption: str
    memory_text: str
    public_path: str
    thumb_path: str
    audio: AudioAttachment | None


class MemorySubmissionRead(SQLModel):
    id: str
    place_id: str
    author_name: str | None
    author_city: str | None
    caption: str
    memory_text: str
    status: ReviewStatus
    created_at: datetime


class MemoryAdminRead(SQLModel):
    id: str
    place_id: str
    author_name: str | None
    author_city: str | None
    caption: str
    memory_text: str
    public_path: str | None
    thumb_path: str | None
    admin_public_path: str
    admin_thumb_path: str
    audio: AudioAttachment | None
    admin_audio: AudioAttachment | None
    status: ReviewStatus
    paid: bool
    share_slug: str
    consent_confirmed: bool
    created_at: datetime
    approved_at: datetime | None


class MemoryReview(SQLModel):
    status: ReviewFinalStatus


class MemoryClaimToken(SQLModel):
    claim_token: str


class MemoryClaimRead(SQLModel):
    can_edit: bool


class MemoryUpdate(MemoryClaimToken):
    author_name: str | None = None
    author_city: str | None = None
    caption: str
    memory_text: str


class MemoryAdminUpdate(SQLModel):
    author_name: str | None = Field(default=None, max_length=40)
    author_city: str | None = Field(default=None, max_length=40)
    caption: str = Field(max_length=80)
    memory_text: str = Field(max_length=240)
