from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.api.routes.memories import memory_to_read
from app.db.session import get_session
from app.models.memory import Memory
from app.models.place import Place
from app.schemas.memory import MemoryAdminRead, MemoryReview
from app.services.media.images import delete_stored_image
from app.services.review import apply_memory_deleted, ensure_final_review_status, ensure_visible_review_status, review_memory

router = APIRouter(prefix="/api/admin/memories", tags=["admin memories"], dependencies=[Depends(require_admin_token)])


def memory_to_admin_read(memory: Memory) -> MemoryAdminRead:
    public_memory = memory_to_read(memory)
    return MemoryAdminRead(**public_memory.model_dump(), consent_confirmed=memory.consent_confirmed)


@router.get("", response_model=list[MemoryAdminRead])
def list_admin_memories(
    status: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[MemoryAdminRead]:
    if status is not None:
        ensure_visible_review_status(status)

    statement = select(Memory).order_by(Memory.created_at.desc())
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
