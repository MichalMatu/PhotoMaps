from app.models.photo import Photo
from app.schemas.photo import PhotoAdminRead, PhotoRead


def photo_to_read(photo: Photo) -> PhotoRead:
    return PhotoRead(
        id=photo.id,
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        status=photo.status,
        caption=photo.caption,
        created_at=photo.created_at,
        approved_at=photo.approved_at,
    )


def photo_to_admin_read(photo: Photo) -> PhotoAdminRead:
    return PhotoAdminRead(
        id=photo.id,
        place_id=photo.place_id,
        public_path=photo.public_path,
        thumb_path=photo.thumb_path,
        status=photo.status,
        caption=photo.caption,
        consent_confirmed=photo.consent_confirmed,
        created_at=photo.created_at,
        approved_at=photo.approved_at,
    )
