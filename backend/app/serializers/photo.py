from app.models.photo import Photo
from app.schemas.photo import PhotoAdminRead, PhotoRead
from app.serializers.audio import audio_to_read


def photo_to_read(photo: Photo) -> PhotoRead:
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


def photo_to_admin_read(photo: Photo) -> PhotoAdminRead:
    return PhotoAdminRead(
        id=photo.id,
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        role=photo.role,
        source=photo.source,
        status=photo.status,
        caption=photo.caption,
        description_blocks=photo.description_blocks or [],
        attribution_author=photo.attribution_author,
        attribution_source_url=photo.attribution_source_url,
        attribution_license=photo.attribution_license,
        attribution_license_url=photo.attribution_license_url,
        audio=audio_to_read(photo),
        consent_confirmed=photo.consent_confirmed,
        created_at=photo.created_at,
        approved_at=photo.approved_at,
    )
