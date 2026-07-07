from fastapi import HTTPException, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.models.memory import Memory
from app.services.media.audio import (
    StoredPrivateAudio,
    audio_paths,
    clear_audio_metadata,
    delete_public_audio,
    delete_stored_audio,
    publish_private_audio,
    store_private_audio_bytes,
)
from app.services.media.images import (
    StoredPrivateImage,
    delete_public_image,
    delete_stored_image,
    publish_image_derivatives,
    store_private_image_bytes,
)
from app.services.media.pending_queue import ensure_public_pending_media_capacity
from app.services.tokens import claim_token_hash


def delete_memory_files(memory: Memory) -> None:
    delete_stored_image(memory.original_path, memory.public_path, memory.thumb_path)
    delete_stored_audio(memory.audio_original_path, memory.audio_public_path)


def cleanup_stored_upload(stored_image: StoredPrivateImage | None, stored_audio: StoredPrivateAudio | None) -> None:
    if stored_image is not None:
        delete_stored_image(stored_image.original_path, None, None)
    if stored_audio is not None:
        delete_stored_audio(stored_audio.original_path, None)


def publish_memory_media(memory: Memory) -> None:
    stored_image = publish_image_derivatives(memory.original_path)
    memory.public_path = stored_image.public_path
    memory.thumb_path = stored_image.thumb_path

    if memory.audio_original_path is not None:
        stored_audio = publish_private_audio(memory.audio_original_path)
        memory.audio_public_path = stored_audio.public_path
        memory.audio_size_bytes = stored_audio.size_bytes


def unpublish_memory_media(memory: Memory) -> None:
    delete_public_image(memory.public_path, memory.thumb_path)
    delete_public_audio(memory.audio_public_path)
    memory.public_path = None
    memory.thumb_path = None
    memory.audio_public_path = None


async def create_memory_from_upload(
    *,
    audio_file: UploadFile | None,
    author_city: str | None,
    author_name: str | None,
    caption: str,
    claim_token: str,
    file: UploadFile,
    memory_text: str,
    place_id: str,
    session: Session,
) -> Memory:
    content = await file.read()
    audio_content = await audio_file.read() if audio_file is not None else None
    ensure_public_pending_media_capacity(session, len(content) + len(audio_content or b""))

    stored_image = None
    stored_audio: StoredPrivateAudio | None = None
    try:
        stored_image = store_private_image_bytes(content, file.filename, place_id, "memories")
        if audio_file is not None and audio_content is not None:
            stored_audio = store_private_audio_bytes(
                audio_content,
                audio_file.filename,
                audio_file.content_type,
                place_id,
                "memories",
            )
        memory = Memory(
            place_id=place_id,
            author_name=author_name,
            author_city=author_city,
            caption=caption,
            memory_text=memory_text,
            original_path=stored_image.original_path,
            public_path=None,
            thumb_path=None,
            audio_original_path=stored_audio.original_path if stored_audio else None,
            audio_public_path=None,
            audio_mime_type=stored_audio.mime_type if stored_audio else None,
            audio_size_bytes=stored_audio.size_bytes if stored_audio else None,
            audio_duration_seconds=stored_audio.duration_seconds if stored_audio else None,
            status="pending",
            consent_confirmed=True,
            claim_token_hash=claim_token_hash(claim_token),
        )
        session.add(memory)
        session.commit()
        session.refresh(memory)
    except HTTPException:
        cleanup_stored_upload(stored_image, stored_audio)
        raise
    except SQLAlchemyError as exc:
        session.rollback()
        cleanup_stored_upload(stored_image, stored_audio)
        raise HTTPException(status_code=500, detail="Memory could not be saved") from exc
    return memory


async def replace_memory_audio(memory: Memory, audio_file: UploadFile, session: Session) -> Memory:
    content = await audio_file.read()
    old_original_path, old_public_path = audio_paths(memory)
    stored_audio: StoredPrivateAudio | None = None
    stored_public_path: str | None = None
    try:
        stored_audio = store_private_audio_bytes(
            content,
            audio_file.filename,
            audio_file.content_type,
            memory.place_id,
            "memories",
        )
        memory.audio_original_path = stored_audio.original_path
        memory.audio_public_path = None
        memory.audio_mime_type = stored_audio.mime_type
        memory.audio_size_bytes = stored_audio.size_bytes
        memory.audio_duration_seconds = stored_audio.duration_seconds
        if memory.status == "approved":
            published_audio = publish_private_audio(stored_audio.original_path)
            stored_public_path = published_audio.public_path
            memory.audio_public_path = published_audio.public_path
            memory.audio_size_bytes = published_audio.size_bytes
        session.add(memory)
        session.commit()
        session.refresh(memory)
    except HTTPException:
        if stored_audio is not None:
            delete_stored_audio(stored_audio.original_path, stored_public_path)
        raise
    except SQLAlchemyError as exc:
        session.rollback()
        if stored_audio is not None:
            delete_stored_audio(stored_audio.original_path, stored_public_path)
        raise HTTPException(status_code=500, detail="Memory audio could not be saved") from exc

    delete_stored_audio(old_original_path, old_public_path)
    return memory


def delete_memory_audio(memory: Memory, session: Session) -> Memory:
    old_original_path, old_public_path = audio_paths(memory)
    clear_audio_metadata(memory)
    try:
        session.add(memory)
        session.commit()
        session.refresh(memory)
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="Memory audio could not be deleted") from exc

    delete_stored_audio(old_original_path, old_public_path)
    return memory
