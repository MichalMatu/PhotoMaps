from datetime import datetime

from sqlmodel import SQLModel


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
