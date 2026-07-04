from fastapi import HTTPException

MAX_MEMORY_AUTHOR_LENGTH = 40
MAX_MEMORY_CAPTION_LENGTH = 80
MAX_MEMORY_TEXT_LENGTH = 240


def normalize_required_text(value: str, field_label: str, max_length: int) -> str:
    normalized_value = value.strip()
    if not normalized_value:
        raise HTTPException(status_code=422, detail=f"{field_label} is required")
    if len(normalized_value) > max_length:
        raise HTTPException(status_code=422, detail=f"{field_label} must have at most {max_length} characters")
    return normalized_value


def normalize_optional_text(value: str | None, field_label: str, max_length: int) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    if not normalized_value:
        return None
    if len(normalized_value) > max_length:
        raise HTTPException(status_code=422, detail=f"{field_label} must have at most {max_length} characters")
    return normalized_value
