from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.models.photo import Photo
from app.services.media.images import delete_stored_image, store_uploaded_image
from app.services.photo_fields import normalize_photo_caption


async def create_photo_from_upload(
    *,
    caption: str | None,
    consent_confirmed: bool,
    file: UploadFile,
    place_id: str,
    session: Session,
    source: str,
) -> Photo:
    normalized_caption = normalize_photo_caption(caption)
    stored_image = await store_uploaded_image(file, place_id, "photos")
    try:
        photo = Photo(
            place_id=place_id,
            original_path=stored_image.original_path,
            public_path=stored_image.public_path,
            thumb_path=stored_image.thumb_path,
            status="pending",
            source=source,
            caption=normalized_caption,
            consent_confirmed=consent_confirmed,
        )
        session.add(photo)
        session.commit()
        session.refresh(photo)
    except SQLAlchemyError as exc:
        session.rollback()
        delete_stored_image(stored_image.original_path, stored_image.public_path, stored_image.thumb_path)
        raise HTTPException(status_code=500, detail="Photo could not be saved") from exc
    return photo
