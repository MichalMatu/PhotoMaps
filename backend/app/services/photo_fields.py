from fastapi import HTTPException

MAX_PHOTO_CAPTION_LENGTH = 120


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
