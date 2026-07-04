import re
from urllib.parse import urlparse

from pydantic import field_validator
from sqlmodel import Field, SQLModel

from app.schemas.contract_types import PlaceCustomFieldType

CUSTOM_FIELD_KEY_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,63}$")
HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


class AppConfigBranding(SQLModel):
    primary_color: str = "#2563eb"
    logo_url: str | None = None

    @field_validator("primary_color")
    @classmethod
    def validate_primary_color(cls, value: str) -> str:
        normalized = value.strip()
        if not HEX_COLOR_PATTERN.fullmatch(normalized):
            raise ValueError("Primary color must be a 6-digit hex color")
        return normalized

    @field_validator("logo_url")
    @classmethod
    def validate_logo_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Logo URL must be a valid URL")
        return normalized


class AppConfigMapCenter(SQLModel):
    lat: float
    lon: float

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, value: float) -> float:
        if value < -90 or value > 90:
            raise ValueError("Latitude must be between -90 and 90")
        return value

    @field_validator("lon")
    @classmethod
    def validate_lon(cls, value: float) -> float:
        if value < -180 or value > 180:
            raise ValueError("Longitude must be between -180 and 180")
        return value


class AppConfigMap(SQLModel):
    fallback_center: AppConfigMapCenter
    fallback_zoom: int = 13

    @field_validator("fallback_zoom")
    @classmethod
    def validate_zoom(cls, value: int) -> int:
        if value < 1 or value > 20:
            raise ValueError("Fallback zoom must be between 1 and 20")
        return value


class PlaceCustomFieldDefinition(SQLModel):
    key: str
    label: str
    type: PlaceCustomFieldType
    required: bool = False
    public: bool = False
    options: list[str] | None = None
    sort_order: int = 0

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        normalized = value.strip()
        if not CUSTOM_FIELD_KEY_PATTERN.fullmatch(normalized):
            raise ValueError("Custom field key must use lowercase letters, numbers and underscores")
        return normalized

    @field_validator("label")
    @classmethod
    def validate_label(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Custom field label cannot be empty")
        return normalized


class AppConfigRead(SQLModel):
    product_name: str = "PhotoMap"
    locale: str = "pl-PL"
    labels: dict[str, str] = Field(default_factory=dict)
    branding: AppConfigBranding = Field(default_factory=AppConfigBranding)
    map: AppConfigMap
    place_custom_fields: list[PlaceCustomFieldDefinition] = Field(default_factory=list)

    @field_validator("product_name", "locale")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be empty")
        return normalized


class AppConfigUpdate(AppConfigRead):
    pass
