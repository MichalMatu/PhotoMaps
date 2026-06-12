from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.memory import Memory
from app.models.place import Place
from app.schemas.memory import MemoryAdminRead, MemoryAdminUpdate, MemoryReview
from app.serializers.memory import memory_to_admin_read
from app.services.media.images import delete_stored_image
from app.services.memory_fields import (
    MAX_MEMORY_AUTHOR_LENGTH,
    MAX_MEMORY_CAPTION_LENGTH,
    MAX_MEMORY_TEXT_LENGTH,
    normalize_optional_text,
    normalize_required_text,
)
from app.services.review import (
    apply_memory_deleted,
    ensure_final_review_status,
    ensure_visible_review_status,
    review_memory,
)

router = APIRouter(prefix="/api/admin/memories", tags=["admin memories"], dependencies=[Depends(require_admin_token)])


@router.get("", response_model=list[MemoryAdminRead])
def list_admin_memories(
    status: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[MemoryAdminRead]:
    if status is not None:
        ensure_visible_review_status(status)

    statement = select(Memory).join(Place, Memory.place_id == Place.id).order_by(Memory.created_at.desc())
    if status is not None:
        statement = statement.where(Memory.status == status)

    return [memory_to_admin_read(memory) for memory in session.exec(statement).all()]


@router.post("/{memory_id}/review", response_model=MemoryAdminRead)
def review_place_memory(
    memory_id: str,
    payload: MemoryReview,
    session: Session = Depends(get_session),
) -> MemoryAdminRead:
    ensure_final_review_status(payload.status)

    memory = session.get(Memory, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")

    place = session.get(Place, memory.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    review_memory(memory, place, payload.status)
    session.add(memory)
    session.add(place)
    session.commit()
    session.refresh(memory)
    return memory_to_admin_read(memory)


@router.patch("/{memory_id}", response_model=MemoryAdminRead)
def update_memory(
    memory_id: str,
    payload: MemoryAdminUpdate,
    session: Session = Depends(get_session),
) -> MemoryAdminRead:
    memory = session.get(Memory, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")

    memory.caption = normalize_required_text(payload.caption, "Memory caption", MAX_MEMORY_CAPTION_LENGTH)
    memory.memory_text = normalize_required_text(payload.memory_text, "Memory text", MAX_MEMORY_TEXT_LENGTH)
    memory.author_name = normalize_optional_text(payload.author_name, "Author name", MAX_MEMORY_AUTHOR_LENGTH)
    memory.author_city = normalize_optional_text(payload.author_city, "Author city", MAX_MEMORY_AUTHOR_LENGTH)
    session.add(memory)
    session.commit()
    session.refresh(memory)
    return memory_to_admin_read(memory)


@router.delete("/{memory_id}", status_code=204)
def delete_memory(memory_id: str, session: Session = Depends(get_session)) -> None:
    memory = session.get(Memory, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")

    place = session.get(Place, memory.place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    apply_memory_deleted(memory, place)
    session.delete(memory)
    session.add(place)
    session.commit()
    delete_stored_image(memory.original_path, memory.public_path, memory.thumb_path)
    return None
