from app.models.photo import Photo
from app.schemas.audio import AudioAttachment
from app.schemas.photo import PhotoAdminRead, PhotoRead
from app.serializers.audio import audio_to_read


def photo_admin_media_path(photo: Photo, media: str) -> str:
    return f"/api/admin/photos/{photo.id}/media/{media}"


def photo_to_read(photo: Photo) -> PhotoRead:
    if photo.public_path is None or photo.thumb_path is None:
        raise ValueError("Public photo media is not published")
    return PhotoRead(
        id=photo.id,
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        caption=photo.caption,
        description_blocks=photo.description_blocks or [],
        attribution_author=photo.attribution_author,
        attribution_source_url=photo.attribution_source_url,
        attribution_license=photo.attribution_license,
        attribution_license_url=photo.attribution_license_url,
        audio=audio_to_read(photo) if photo.status == "approved" else None,
    )


def photo_admin_audio_to_read(photo: Photo) -> AudioAttachment | None:
    if (
        photo.audio_original_path is None
        or photo.audio_mime_type is None
        or photo.audio_size_bytes is None
        or photo.audio_duration_seconds is None
    ):
        return None

    return AudioAttachment(
        public_path=photo_admin_media_path(photo, "audio"),
        mime_type=photo.audio_mime_type,
        size_bytes=photo.audio_size_bytes,
        duration_seconds=photo.audio_duration_seconds,
    )


def photo_to_admin_read(photo: Photo) -> PhotoAdminRead:
    return PhotoAdminRead(
        id=photo.id,
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        admin_public_path=photo_admin_media_path(photo, "image"),
        admin_thumb_path=photo_admin_media_path(photo, "thumb"),
        role=photo.role,
        source=photo.source,
        status=photo.status,
        caption=photo.caption,
        description_blocks=photo.description_blocks or [],
        attribution_author=photo.attribution_author,
        attribution_source_url=photo.attribution_source_url,
        attribution_license=photo.attribution_license,
        attribution_license_url=photo.attribution_license_url,
        audio=audio_to_read(photo) if photo.status == "approved" else None,
        admin_audio=photo_admin_audio_to_read(photo),
        consent_confirmed=photo.consent_confirmed,
        created_at=photo.created_at,
        approved_at=photo.approved_at,
    )
