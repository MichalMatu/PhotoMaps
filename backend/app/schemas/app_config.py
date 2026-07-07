import re
from urllib.parse import urlparse

from pydantic import field_validator, model_validator
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


class AppConfigMapMarkerSize(SQLModel):
    width: int = 72
    height: int = 58

    @field_validator("width")
    @classmethod
    def validate_width(cls, value: int) -> int:
        if value < 32 or value > 240:
            raise ValueError("Marker tile width must be between 32 and 240")
        return value

    @field_validator("height")
    @classmethod
    def validate_height(cls, value: int) -> int:
        if value < 24 or value > 220:
            raise ValueError("Marker tile height must be between 24 and 220")
        return value


class AppConfigMapMarkerPriorityScale(SQLModel):
    min_scale: float = 0.72
    max_scale: float = 1.9
    curve: float = 1.12

    @field_validator("min_scale", "max_scale")
    @classmethod
    def validate_scale(cls, value: float) -> float:
        if value < 0.25 or value > 3:
            raise ValueError("Marker priority scale must be between 0.25 and 3")
        return value

    @field_validator("curve")
    @classmethod
    def validate_curve(cls, value: float) -> float:
        if value < 0.25 or value > 3:
            raise ValueError("Marker priority curve must be between 0.25 and 3")
        return value

    @model_validator(mode="after")
    def validate_scale_order(self) -> "AppConfigMapMarkerPriorityScale":
        if self.min_scale > self.max_scale:
            raise ValueError("Marker priority min scale cannot be greater than max scale")
        return self


class AppConfigMapMarkerScale(SQLModel):
    base_size: AppConfigMapMarkerSize = Field(default_factory=AppConfigMapMarkerSize)
    min_render_scale: float = 0.55
    max_render_scale: float = 1.9
    priority: AppConfigMapMarkerPriorityScale = Field(default_factory=AppConfigMapMarkerPriorityScale)

    @field_validator("min_render_scale", "max_render_scale")
    @classmethod
    def validate_render_scale(cls, value: float) -> float:
        if value < 0.25 or value > 3:
            raise ValueError("Marker render scale must be between 0.25 and 3")
        return value

    @model_validator(mode="after")
    def validate_render_scale_order(self) -> "AppConfigMapMarkerScale":
        if self.min_render_scale > self.max_render_scale:
            raise ValueError("Marker min render scale cannot be greater than max render scale")
        return self


class AppConfigMapMarkerDensity(SQLModel):
    marker_viewport_area: int = 18_000
    min_zoom: float = 6
    full_density_zoom: float = 15
    min_zoom_fill_ratio: float = 0.12
    max_zoom_fill_ratio: float = 1
    zoom_curve: float = 1.35

    @field_validator("marker_viewport_area")
    @classmethod
    def validate_marker_viewport_area(cls, value: int) -> int:
        if value < 3_000 or value > 80_000:
            raise ValueError("Marker viewport area must be between 3000 and 80000")
        return value

    @field_validator("min_zoom", "full_density_zoom")
    @classmethod
    def validate_density_zoom(cls, value: float) -> float:
        if value < 1 or value > 20:
            raise ValueError("Marker density zoom must be between 1 and 20")
        return value

    @field_validator("min_zoom_fill_ratio", "max_zoom_fill_ratio")
    @classmethod
    def validate_fill_ratio(cls, value: float) -> float:
        if value < 0.02 or value > 1.5:
            raise ValueError("Marker density fill ratio must be between 0.02 and 1.5")
        return value

    @field_validator("zoom_curve")
    @classmethod
    def validate_zoom_curve(cls, value: float) -> float:
        if value < 0.25 or value > 4:
            raise ValueError("Marker density zoom curve must be between 0.25 and 4")
        return value

    @model_validator(mode="after")
    def validate_density_order(self) -> "AppConfigMapMarkerDensity":
        if self.min_zoom > self.full_density_zoom:
            raise ValueError("Marker density min zoom cannot be greater than full density zoom")
        if self.min_zoom_fill_ratio > self.max_zoom_fill_ratio:
            raise ValueError("Marker density min fill ratio cannot be greater than max fill ratio")
        return self


class AppConfigMapMarkerPriority(SQLModel):
    editorial_weight_multiplier: float = 12
    photo_count_sqrt_multiplier: float = 3.2
    memory_count_multiplier: float = 2
    score_multiplier: float = 0.28

    @field_validator(
        "editorial_weight_multiplier",
        "photo_count_sqrt_multiplier",
        "memory_count_multiplier",
        "score_multiplier",
    )
    @classmethod
    def validate_priority_multiplier(cls, value: float) -> float:
        if value < 0 or value > 100:
            raise ValueError("Marker priority multiplier must be between 0 and 100")
        return value


class AppConfigMap(SQLModel):
    fallback_center: AppConfigMapCenter
    fallback_zoom: int = 13
    marker_scale: AppConfigMapMarkerScale = Field(default_factory=AppConfigMapMarkerScale)
    marker_density: AppConfigMapMarkerDensity = Field(default_factory=AppConfigMapMarkerDensity)
    marker_priority: AppConfigMapMarkerPriority = Field(default_factory=AppConfigMapMarkerPriority)

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
