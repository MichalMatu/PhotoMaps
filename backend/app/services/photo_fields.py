import json
from urllib.parse import urlparse

from fastapi import HTTPException

from app.schemas.content import ContentBlock
from app.services.content_blocks import content_blocks_for_storage

MAX_PHOTO_CAPTION_LENGTH = 120
MAX_PHOTO_ATTRIBUTION_AUTHOR_LENGTH = 120
MAX_PHOTO_ATTRIBUTION_LICENSE_LENGTH = 120
MAX_PHOTO_ATTRIBUTION_URL_LENGTH = 500


def normalize_photo_caption(caption: str | None) -> str | None:
    if caption is None:
        return None

    normalized_caption = caption.strip()
    if not normalized_caption:
        return None
    if len(normalized_caption) > MAX_PHOTO_CAPTION_LENGTH:
        raise HTTPException(
            status_code=422, detail=f"Photo caption must have at most {MAX_PHOTO_CAPTION_LENGTH} characters"
        )
    return normalized_caption


def normalize_photo_description_blocks(blocks: list[ContentBlock] | None) -> list[dict[str, str]]:
    return content_blocks_for_storage(blocks or [])


def photo_description_blocks_from_form(value: str | None) -> list[ContentBlock]:
    if value is None or not value.strip():
        return []
    try:
        raw_blocks = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Photo description blocks must be valid JSON") from exc
    if not isinstance(raw_blocks, list):
        raise HTTPException(status_code=422, detail="Photo description blocks must be a list")
    try:
        return [ContentBlock.model_validate(raw_block) for raw_block in raw_blocks]
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def normalize_photo_attribution_text(value: str | None, field_label: str, max_length: int) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    if not normalized_value:
        return None
    if len(normalized_value) > max_length:
        raise HTTPException(status_code=422, detail=f"{field_label} must have at most {max_length} characters")
    return normalized_value


def normalize_photo_attribution_url(value: str | None, field_label: str) -> str | None:
    normalized_value = normalize_photo_attribution_text(value, field_label, MAX_PHOTO_ATTRIBUTION_URL_LENGTH)
    if normalized_value is None:
        return None

    parsed = urlparse(normalized_value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=422, detail=f"{field_label} must be a valid HTTP(S) URL")
    return normalized_value


def normalize_photo_attribution(
    *,
    attribution_author: str | None,
    attribution_license: str | None,
    attribution_license_url: str | None,
    attribution_source_url: str | None,
) -> dict[str, str | None]:
    return {
        "attribution_author": normalize_photo_attribution_text(
            attribution_author,
            "Photo attribution author",
            MAX_PHOTO_ATTRIBUTION_AUTHOR_LENGTH,
        ),
        "attribution_source_url": normalize_photo_attribution_url(
            attribution_source_url,
            "Photo attribution source URL",
        ),
        "attribution_license": normalize_photo_attribution_text(
            attribution_license,
            "Photo attribution license",
            MAX_PHOTO_ATTRIBUTION_LICENSE_LENGTH,
        ),
        "attribution_license_url": normalize_photo_attribution_url(
            attribution_license_url,
            "Photo attribution license URL",
        ),
    }
