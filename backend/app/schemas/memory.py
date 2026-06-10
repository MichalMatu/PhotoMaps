from datetime import datetime

from sqlmodel import Field, SQLModel


class MemoryRead(SQLModel):
    id: str
    place_id: str
    author_name: str | None
    author_city: str | None
    caption: str
    memory_text: str
    public_path: str
    thumb_path: str
    status: str
    paid: bool
    share_slug: str
    created_at: datetime
    approved_at: datetime | None


class MemoryAdminRead(MemoryRead):
    consent_confirmed: bool


class MemoryReview(SQLModel):
    status: str


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
