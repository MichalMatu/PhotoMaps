from datetime import UTC, datetime

from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.models.photo import Photo
from app.models.place import Place
from app.schemas.content import ContentBlock
from app.services.media.audio import (
    StoredAudio,
    assign_stored_audio,
    audio_paths,
    clear_audio_metadata,
    delete_stored_audio,
    store_audio_bytes,
)
from app.services.media.images import StoredImage, delete_stored_image, store_image_bytes
from app.services.photo_fields import (
    normalize_photo_attribution,
    normalize_photo_caption,
    normalize_photo_description_blocks,
)


def delete_photo_files(photo: Photo) -> None:
    delete_stored_image(photo.original_path, photo.public_path, photo.thumb_path)
    delete_stored_audio(photo.audio_original_path, photo.audio_public_path)


def cleanup_stored_upload(stored_image, stored_audio: StoredAudio | None) -> None:
    if stored_image is not None:
        delete_stored_image(stored_image.original_path, stored_image.public_path, stored_image.thumb_path)
    if stored_audio is not None:
        delete_stored_audio(stored_audio.original_path, stored_audio.public_path)


def attach_approved_place_photo(
    *,
    as_cover: bool,
    attribution_author: str | None = None,
    attribution_license: str | None = None,
    attribution_license_url: str | None = None,
    attribution_source_url: str | None = None,
    caption: str | None,
    description_blocks: list[ContentBlock] | None = None,
    place: Place,
    role: str,
    session: Session,
    source: str,
    stored_image: StoredImage,
) -> Photo:
    now = datetime.now(UTC)
    attribution = normalize_photo_attribution(
        attribution_author=attribution_author,
        attribution_license=attribution_license,
        attribution_license_url=attribution_license_url,
        attribution_source_url=attribution_source_url,
    )
    photo = Photo(
        place_id=place.id,
        original_path=stored_image.original_path,
        public_path=stored_image.public_path,
        thumb_path=stored_image.thumb_path,
        role=role,
        source=source,
        status="approved",
        caption=normalize_photo_caption(caption),
        description_blocks=normalize_photo_description_blocks(description_blocks),
        **attribution,
        consent_confirmed=True,
        approved_at=now,
    )
    session.add(photo)
    session.flush()
    place.photo_count += 1
    if as_cover:
        place.cover_photo_id = photo.id
    place.updated_at = now
    session.add(place)
    return photo


async def create_editorial_photo_from_upload(
    *,
    audio_file: UploadFile | None = None,
    attribution_author: str | None = None,
    attribution_license: str | None = None,
    attribution_license_url: str | None = None,
    attribution_source_url: str | None = None,
    caption: str | None,
    description_blocks: list[ContentBlock] | None = None,
    file: UploadFile,
    place_id: str,
    session: Session,
) -> Photo:
    normalized_caption = normalize_photo_caption(caption)
    normalized_description_blocks = normalize_photo_description_blocks(description_blocks)
    attribution = normalize_photo_attribution(
        attribution_author=attribution_author,
        attribution_license=attribution_license,
        attribution_license_url=attribution_license_url,
        attribution_source_url=attribution_source_url,
    )
    content = await file.read()
    audio_content = await audio_file.read() if audio_file is not None else None

    stored_image = None
    stored_audio: StoredAudio | None = None
    try:
        stored_image = store_image_bytes(content, file.filename, place_id, "photos")
        if audio_file is not None and audio_content is not None:
            stored_audio = store_audio_bytes(
                audio_content,
                audio_file.filename,
                audio_file.content_type,
                place_id,
                "photos",
            )
        photo = Photo(
            place_id=place_id,
            original_path=stored_image.original_path,
            public_path=stored_image.public_path,
            thumb_path=stored_image.thumb_path,
            audio_original_path=stored_audio.original_path if stored_audio else None,
            audio_public_path=stored_audio.public_path if stored_audio else None,
            audio_mime_type=stored_audio.mime_type if stored_audio else None,
            audio_size_bytes=stored_audio.size_bytes if stored_audio else None,
            audio_duration_seconds=stored_audio.duration_seconds if stored_audio else None,
            status="pending",
            source="editorial",
            caption=normalized_caption,
            description_blocks=normalized_description_blocks,
            **attribution,
            consent_confirmed=True,
        )
        session.add(photo)
        session.commit()
        session.refresh(photo)
    except HTTPException:
        cleanup_stored_upload(stored_image, stored_audio)
        raise
    except SQLAlchemyError as exc:
        session.rollback()
        cleanup_stored_upload(stored_image, stored_audio)
        raise HTTPException(status_code=500, detail="Photo could not be saved") from exc
    return photo


async def replace_photo_audio(photo: Photo, audio_file: UploadFile, session: Session) -> Photo:
    content = await audio_file.read()
    old_original_path, old_public_path = audio_paths(photo)
    stored_audio: StoredAudio | None = None
    try:
        stored_audio = store_audio_bytes(
            content,
            audio_file.filename,
            audio_file.content_type,
            photo.place_id,
            "photos",
        )
        assign_stored_audio(photo, stored_audio)
        session.add(photo)
        session.commit()
        session.refresh(photo)
    except HTTPException:
        if stored_audio is not None:
            delete_stored_audio(stored_audio.original_path, stored_audio.public_path)
        raise
    except SQLAlchemyError as exc:
        session.rollback()
        if stored_audio is not None:
            delete_stored_audio(stored_audio.original_path, stored_audio.public_path)
        raise HTTPException(status_code=500, detail="Photo audio could not be saved") from exc

    delete_stored_audio(old_original_path, old_public_path)
    return photo


def delete_photo_audio(photo: Photo, session: Session) -> Photo:
    old_original_path, old_public_path = audio_paths(photo)
    clear_audio_metadata(photo)
    try:
        session.add(photo)
        session.commit()
        session.refresh(photo)
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="Photo audio could not be deleted") from exc

    delete_stored_audio(old_original_path, old_public_path)
    return photo
