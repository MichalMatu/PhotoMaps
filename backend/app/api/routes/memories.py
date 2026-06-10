from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.memory import Memory
from app.schemas.memory import MemoryRead
from app.services.media.images import store_uploaded_image
from app.services.places import ensure_public_place

router = APIRouter(prefix="/api/places/{place_id}/memories", tags=["memories"])


def memory_to_read(memory: Memory) -> MemoryRead:
    return MemoryRead(
        id=memory.id,
        place_id=memory.place_id,
        author_name=memory.author_name,
        author_city=memory.author_city,
        caption=memory.caption,
        public_path=memory.public_path,
        thumb_path=memory.thumb_path,
        status=memory.status,
        paid=memory.paid,
        share_slug=memory.share_slug,
        created_at=memory.created_at,
        approved_at=memory.approved_at,
    )


@router.get("", response_model=list[MemoryRead])
def list_place_memories(place_id: str, session: Session = Depends(get_session)) -> list[MemoryRead]:
    ensure_public_place(place_id, session)
    statement = (
        select(Memory)
        .where(Memory.place_id == place_id)
        .where(Memory.status == "approved")
        .order_by(Memory.approved_at.desc(), Memory.created_at.desc())
    )
    return [memory_to_read(memory) for memory in session.exec(statement).all()]


@router.post("", response_model=MemoryRead, status_code=201)
async def upload_place_memory(
    place_id: str,
    file: UploadFile = File(...),
    caption: str = Form(...),
    author_name: str | None = Form(default=None),
    author_city: str | None = Form(default=None),
    consent_confirmed: bool = Form(...),
    session: Session = Depends(get_session),
) -> MemoryRead:
    ensure_public_place(place_id, session)
    if not consent_confirmed:
        raise HTTPException(status_code=422, detail="Publication consent is required")

    normalized_caption = caption.strip()
    if not normalized_caption:
        raise HTTPException(status_code=422, detail="Memory caption is required")

    stored_image = await store_uploaded_image(file, place_id, "memories")
    memory = Memory(
        place_id=place_id,
        author_name=author_name.strip() if author_name else None,
        author_city=author_city.strip() if author_city else None,
        caption=normalized_caption,
        original_path=stored_image.original_path,
        public_path=stored_image.public_path,
        thumb_path=stored_image.thumb_path,
        status="pending",
        consent_confirmed=True,
    )
    session.add(memory)
    session.commit()
    session.refresh(memory)
    return memory_to_read(memory)
