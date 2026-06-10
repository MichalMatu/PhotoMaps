from datetime import datetime

from sqlmodel import Field, SQLModel


class PhotoRead(SQLModel):
    id: str
    place_id: str
    public_path: str
    thumb_path: str
    status: str
    caption: str | None
    created_at: datetime
    approved_at: datetime | None


class PhotoAdminRead(PhotoRead):
    consent_confirmed: bool


class PhotoReview(SQLModel):
    status: str


class PhotoUpdate(SQLModel):
    caption: str | None = Field(default=None, max_length=120)
