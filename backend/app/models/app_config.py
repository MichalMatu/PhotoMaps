from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC)


class AppConfig(SQLModel, table=True):
    __tablename__ = "app_config"

    id: str = Field(primary_key=True)
    product_name: str = "PhotoMap"
    locale: str = "pl-PL"
    labels: dict[str, str] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False, default=dict))
    branding: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False, default=dict))
    map_config: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False, default=dict))
    place_custom_fields: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, default=list),
    )
    updated_at: datetime = Field(default_factory=utc_now)
