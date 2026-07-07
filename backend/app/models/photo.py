from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class Photo(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    place_id: str = Field(foreign_key="place.id", index=True)
    original_path: str
    public_path: str
    thumb_path: str
    audio_original_path: str | None = None
    audio_public_path: str | None = None
    audio_mime_type: str | None = None
    audio_size_bytes: int | None = None
    audio_duration_seconds: float | None = None
    role: str = Field(default="gallery", index=True)
    source: str = Field(default="editorial", index=True)
    status: str = Field(default="pending", index=True)
    caption: str | None = None
    description_blocks: list[dict[str, str]] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False, default=list)
    )
    attribution_author: str | None = Field(default=None, max_length=120)
    attribution_source_url: str | None = Field(default=None, max_length=500)
    attribution_license: str | None = Field(default=None, max_length=120)
    attribution_license_url: str | None = Field(default=None, max_length=500)
    consent_confirmed: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    approved_at: datetime | None = None
