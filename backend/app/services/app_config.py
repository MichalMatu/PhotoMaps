from collections.abc import Mapping, Sequence
from datetime import UTC, date, datetime
from typing import Any
from urllib.parse import urlparse

from pydantic import ValidationError
from sqlmodel import Session, select

from app.core.config import APP_NAME
from app.models.app_config import AppConfig
from app.models.place import Place
from app.schemas.app_config import (
    AppConfigBranding,
    AppConfigMap,
    AppConfigMapCenter,
    AppConfigRead,
    AppConfigUpdate,
    PlaceCustomFieldDefinition,
)

APP_CONFIG_ID = "default"
REQUIRED_LABEL_KEYS = ("place", "places", "category", "categories", "guide", "guides")
SELECT_OPTION_TYPES = {"select"}

BOOTSTRAP_PLACE_CUSTOM_FIELDS: tuple[PlaceCustomFieldDefinition, ...] = (
    PlaceCustomFieldDefinition(
        key="opening_hours",
        label="Godziny otwarcia",
        type="text",
        public=True,
        sort_order=10,
    ),
    PlaceCustomFieldDefinition(key="floor", label="Piętro", type="text", public=True, sort_order=20),
    PlaceCustomFieldDefinition(key="price", label="Cena", type="number", public=True, sort_order=30),
    PlaceCustomFieldDefinition(
        key="booking_url",
        label="Link rezerwacji",
        type="url",
        public=True,
        sort_order=40,
    ),
    PlaceCustomFieldDefinition(
        key="accessibility",
        label="Dostępność",
        type="select",
        options=["pełna", "częściowa", "brak informacji"],
        public=True,
        sort_order=50,
    ),
    PlaceCustomFieldDefinition(key="contact", label="Kontakt", type="text", public=True, sort_order=60),
)


def default_app_config() -> AppConfigRead:
    return AppConfigRead(
        product_name=APP_NAME,
        locale="pl-PL",
        labels={
            "place": "miejsce",
            "places": "miejsca",
            "category": "kategoria",
            "categories": "kategorie",
            "guide": "kolekcja miejsc",
            "guides": "kolekcje miejsc",
        },
        branding=AppConfigBranding(primary_color="#2563eb"),
        map=AppConfigMap(fallback_center=AppConfigMapCenter(lat=52.0, lon=19.0), fallback_zoom=13),
        place_custom_fields=sorted(BOOTSTRAP_PLACE_CUSTOM_FIELDS, key=lambda field: field.sort_order),
    )


def get_app_config(session: Session | None = None) -> AppConfigRead:
    if session is None:
        return default_app_config()
    config = session.get(AppConfig, APP_CONFIG_ID)
    if config is None:
        return default_app_config()
    return app_config_model_to_read(config)


def get_place_custom_field_definitions(session: Session | None = None) -> list[PlaceCustomFieldDefinition]:
    return get_app_config(session).place_custom_fields


def update_app_config(payload: AppConfigUpdate, session: Session) -> AppConfigRead:
    current_config = get_app_config(session)
    next_config = normalize_app_config(payload)
    validate_place_custom_field_config_change(
        current_config.place_custom_fields,
        next_config.place_custom_fields,
        session,
    )

    config = session.get(AppConfig, APP_CONFIG_ID)
    if config is None:
        config = AppConfig(id=APP_CONFIG_ID)

    removed_keys = {field.key for field in current_config.place_custom_fields} - {
        field.key for field in next_config.place_custom_fields
    }
    if removed_keys:
        remove_place_custom_field_values(session, removed_keys)

    config.product_name = next_config.product_name
    config.locale = next_config.locale
    config.labels = next_config.labels
    config.branding = next_config.branding.model_dump()
    config.map_config = next_config.map.model_dump()
    config.place_custom_fields = [field.model_dump() for field in next_config.place_custom_fields]
    config.updated_at = datetime.now(UTC)
    session.add(config)
    session.commit()
    session.refresh(config)
    return app_config_model_to_read(config)


def app_config_model_to_read(config: AppConfig) -> AppConfigRead:
    try:
        return normalize_app_config(
            AppConfigUpdate(
                product_name=config.product_name,
                locale=config.locale,
                labels=config.labels,
                branding=AppConfigBranding.model_validate(config.branding),
                map=AppConfigMap.model_validate(config.map_config),
                place_custom_fields=[
                    PlaceCustomFieldDefinition.model_validate(field) for field in config.place_custom_fields
                ],
            )
        )
    except ValidationError as exc:
        raise ValueError("Stored app configuration is invalid") from exc


def normalize_app_config(payload: AppConfigUpdate) -> AppConfigRead:
    labels = normalize_labels(payload.labels)
    fields = normalize_place_custom_field_definitions(payload.place_custom_fields)
    return AppConfigRead(
        product_name=payload.product_name.strip(),
        locale=payload.locale.strip(),
        labels=labels,
        branding=payload.branding,
        map=payload.map,
        place_custom_fields=fields,
    )


def normalize_labels(labels: Mapping[str, str]) -> dict[str, str]:
    unexpected_keys = sorted(set(labels) - set(REQUIRED_LABEL_KEYS))
    if unexpected_keys:
        raise ValueError(f"labels contains unsupported keys: {', '.join(unexpected_keys)}")

    normalized: dict[str, str] = {}
    for key in REQUIRED_LABEL_KEYS:
        value = labels.get(key)
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"labels.{key} is required")
        normalized[key] = value.strip()
    return normalized


def normalize_place_custom_field_definitions(
    definitions: Sequence[PlaceCustomFieldDefinition],
) -> list[PlaceCustomFieldDefinition]:
    normalized_fields: list[PlaceCustomFieldDefinition] = []
    seen_keys: set[str] = set()

    for definition in definitions:
        normalized = PlaceCustomFieldDefinition(
            key=definition.key,
            label=definition.label,
            type=definition.type,
            required=definition.required,
            public=definition.public,
            options=normalize_custom_field_options(definition),
            sort_order=definition.sort_order,
        )
        if normalized.key in seen_keys:
            raise ValueError(f"place_custom_fields contains duplicated key: {normalized.key}")
        seen_keys.add(normalized.key)
        normalized_fields.append(normalized)

    return sorted(normalized_fields, key=lambda field: (field.sort_order, field.label, field.key))


def normalize_custom_field_options(definition: PlaceCustomFieldDefinition) -> list[str] | None:
    if definition.type not in SELECT_OPTION_TYPES:
        return None
    if not definition.options:
        raise ValueError(f"place_custom_fields.{definition.key}.options is required for select fields")

    normalized_options: list[str] = []
    seen_options: set[str] = set()
    for option in definition.options:
        normalized = option.strip()
        if not normalized:
            raise ValueError(f"place_custom_fields.{definition.key}.options cannot contain empty values")
        if normalized in seen_options:
            raise ValueError(f"place_custom_fields.{definition.key}.options contains duplicated value: {normalized}")
        seen_options.add(normalized)
        normalized_options.append(normalized)
    return normalized_options


def validate_place_custom_field_config_change(
    current_fields: Sequence[PlaceCustomFieldDefinition],
    next_fields: Sequence[PlaceCustomFieldDefinition],
    session: Session,
) -> None:
    current_by_key = {field.key: field for field in current_fields}
    next_by_key = {field.key: field for field in next_fields}

    for key, current_field in current_by_key.items():
        next_field = next_by_key.get(key)
        if next_field is not None and next_field.type != current_field.type:
            raise ValueError(f"Cannot change type for existing custom field: {key}")

    removed_keys = set(current_by_key) - set(next_by_key)
    for place in session.exec(select(Place)).all():
        fields = dict(place.custom_fields or {})
        candidate_fields = {key: value for key, value in fields.items() if key not in removed_keys}
        try:
            normalize_place_custom_fields(
                candidate_fields,
                definitions=next_fields,
                context=f"place[{place.slug}].custom_fields",
            )
        except ValueError as exc:
            raise ValueError(f"Existing place data does not match new custom fields: {exc}") from exc


def remove_place_custom_field_values(session: Session, removed_keys: set[str]) -> None:
    for place in session.exec(select(Place)).all():
        fields = dict(place.custom_fields or {})
        next_fields = {key: value for key, value in fields.items() if key not in removed_keys}
        if next_fields == fields:
            continue
        place.custom_fields = next_fields
        session.add(place)


def normalize_place_custom_fields(
    raw_fields: Mapping[str, Any] | None,
    *,
    definitions: Sequence[PlaceCustomFieldDefinition] | None = None,
    context: str = "custom_fields",
) -> dict[str, Any]:
    if raw_fields is not None and not isinstance(raw_fields, Mapping):
        raise ValueError(f"{context} must be an object")
    fields = dict(raw_fields or {})
    definitions = list(definitions or get_place_custom_field_definitions())
    definitions_by_key = {definition.key: definition for definition in definitions}

    unknown_keys = sorted(set(fields) - set(definitions_by_key))
    if unknown_keys:
        raise ValueError(f"{context} contains unsupported fields: {', '.join(unknown_keys)}")

    normalized: dict[str, Any] = {}
    for definition in sorted(definitions, key=lambda field: field.sort_order):
        value = fields.get(definition.key)
        if _is_empty_custom_field_value(value):
            if definition.required:
                raise ValueError(f"{context}.{definition.key} is required")
            continue
        normalized[definition.key] = _normalize_custom_field_value(definition, value, context=context)
    return normalized


def public_place_custom_fields_for_definitions(
    raw_fields: Mapping[str, Any] | None,
    definitions: Sequence[PlaceCustomFieldDefinition],
) -> dict[str, Any]:
    fields = dict(raw_fields or {})
    public_fields: dict[str, Any] = {}
    for definition in definitions:
        if not definition.public or definition.key not in fields:
            continue
        value = fields[definition.key]
        if not _is_empty_custom_field_value(value):
            public_fields[definition.key] = value
    return public_fields


def _normalize_custom_field_value(
    definition: PlaceCustomFieldDefinition,
    value: Any,
    *,
    context: str,
) -> Any:
    if definition.type in {"text", "textarea"}:
        if not isinstance(value, str):
            raise ValueError(f"{context}.{definition.key} must be a string")
        return value.strip()

    if definition.type == "number":
        if isinstance(value, bool) or not isinstance(value, int | float | str):
            raise ValueError(f"{context}.{definition.key} must be a number")
        if isinstance(value, int | float):
            return value
        try:
            numeric_value = float(value.strip())
        except ValueError as exc:
            raise ValueError(f"{context}.{definition.key} must be a number") from exc
        return int(numeric_value) if numeric_value.is_integer() else numeric_value

    if definition.type == "select":
        if not isinstance(value, str):
            raise ValueError(f"{context}.{definition.key} must be one of the configured options")
        normalized = value.strip()
        if not definition.options or normalized not in definition.options:
            raise ValueError(f"{context}.{definition.key} must be one of the configured options")
        return normalized

    if definition.type == "url":
        if not isinstance(value, str):
            raise ValueError(f"{context}.{definition.key} must be a valid URL")
        normalized = value.strip()
        parsed = urlparse(normalized)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError(f"{context}.{definition.key} must be a valid URL")
        return normalized

    if definition.type == "boolean":
        if not isinstance(value, bool):
            raise ValueError(f"{context}.{definition.key} must be a boolean")
        return value

    if definition.type == "date":
        if not isinstance(value, str):
            raise ValueError(f"{context}.{definition.key} must be an ISO date")
        normalized = value.strip()
        try:
            date.fromisoformat(normalized)
        except ValueError as exc:
            raise ValueError(f"{context}.{definition.key} must be an ISO date") from exc
        return normalized

    raise ValueError(f"{context}.{definition.key} has unsupported type")


def _is_empty_custom_field_value(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())
