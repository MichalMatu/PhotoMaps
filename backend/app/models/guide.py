from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class Guide(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    slug: str = Field(index=True, unique=True)
    kind: str = Field(default="route", index=True)
    title: str
    description: str | None = None
    article_blocks: list[dict[str, str]] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False, default=list)
    )
    route_points: list[dict[str, Any]] = Field(
        default_factory=list, sa_column=Column(JSON, nullable=False, default=list)
    )
    status: str = Field(default="draft", index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class PlaceGuide(SQLModel, table=True):
    __tablename__ = "place_guide"

    guide_id: str = Field(foreign_key="guide.id", primary_key=True)
    place_id: str = Field(foreign_key="place.id", primary_key=True, index=True)
    sort_order: int = 0
