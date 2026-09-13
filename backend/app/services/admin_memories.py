import logging

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from app.models.memory import Memory
from app.models.place import Place
from app.services.media.audio import delete_public_audio
from app.services.media.images import delete_public_image
from app.services.memory_uploads import publish_memory_media
from app.services.review import apply_memory_review_state, ensure_final_review_status

logger = logging.getLogger(__name__)


def get_admin_memory(session: Session, memory_id: str) -> Memory:
    memory = session.get(Memory, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


def get_memory_place(session: Session, memory: Memory) -> Place:
    place = session.get(Place, memory.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place


def cleanup_public_memory_media(public_path: str | None, thumb_path: str | None, audio_public_path: str | None) -> None:
    delete_public_image(public_path, thumb_path)
    delete_public_audio(audio_public_path)


def review_admin_memory(session: Session, memory_id: str, status: str) -> Memory:
    ensure_final_review_status(status)
    memory = get_admin_memory(session, memory_id)
    place = get_memory_place(session, memory)

    previous_status = memory.status
    previous_public_path = memory.public_path
    previous_thumb_path = memory.thumb_path
    previous_audio_public_path = memory.audio_public_path

    if status == "approved":
        should_publish = previous_status != "approved" or memory.public_path is None or memory.thumb_path is None
        published_paths: tuple[str | None, str | None, str | None] | None = None
        if should_publish:
            try:
                publish_memory_media(memory)
                published_paths = (memory.public_path, memory.thumb_path, memory.audio_public_path)
            except HTTPException:
                failed_paths = (memory.public_path, memory.thumb_path, memory.audio_public_path)
                session.rollback()
                cleanup_public_memory_media(*failed_paths)
                raise

        apply_memory_review_state(memory, place, status)
        session.add(memory)
        session.add(place)
        try:
            session.commit()
        except SQLAlchemyError as exc:
            session.rollback()
            if published_paths is not None:
                cleanup_public_memory_media(*published_paths)
            raise HTTPException(status_code=500, detail="Memory review could not be saved") from exc

        session.refresh(memory)
        return memory

    apply_memory_review_state(memory, place, status)
    memory.public_path = None
    memory.thumb_path = None
    memory.audio_public_path = None
    session.add(memory)
    session.add(place)
    try:
        session.commit()
    except SQLAlchemyError as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail="Memory review could not be saved") from exc

    try:
        cleanup_public_memory_media(previous_public_path, previous_thumb_path, previous_audio_public_path)
    except (OSError, ValueError):
        logger.exception(
            "Committed memory rejection left public media for orphan cleanup",
            extra={"memory_id": memory.id},
        )

    session.refresh(memory)
    return memory
