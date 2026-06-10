from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.memory import Memory
from app.models.place import Place
from app.schemas.memory import MemoryClaimRead, MemoryClaimToken, MemoryRead, MemoryUpdate
from app.services.media.images import delete_stored_image, store_uploaded_image
from app.services.places import ensure_public_place
from app.services.review import apply_memory_deleted
from app.services.tokens import claim_token_hash, verify_claim_token

router = APIRouter(prefix="/api/places/{place_id}/memories", tags=["memories"])
MAX_MEMORY_AUTHOR_LENGTH = 40
MAX_MEMORY_CAPTION_LENGTH = 80
MAX_MEMORY_TEXT_LENGTH = 240


def memory_to_read(memory: Memory) -> MemoryRead:
    return MemoryRead(
        id=memory.id,
        place_id=memory.place_id,
        author_name=memory.author_name,
        author_city=memory.author_city,
        caption=memory.caption,
        memory_text=memory.memory_text,
        public_path=memory.public_path,
        thumb_path=memory.thumb_path,
        status=memory.status,
        paid=memory.paid,
        share_slug=memory.share_slug,
        created_at=memory.created_at,
        approved_at=memory.approved_at,
    )


def get_place_memory(place_id: str, memory_id: str, session: Session) -> tuple[Place, Memory]:
    place = ensure_public_place(place_id, session)
    memory = session.get(Memory, memory_id)
    if memory is None or memory.place_id != place.id:
        raise HTTPException(status_code=404, detail="Memory not found")
    return place, memory


def require_memory_claim(memory: Memory, claim_token: str) -> None:
    if not verify_claim_token(claim_token, memory.claim_token_hash):
        raise HTTPException(status_code=403, detail="Invalid memory token")


def normalize_required_text(value: str, field_label: str, max_length: int) -> str:
    normalized_value = value.strip()
    if not normalized_value:
        raise HTTPException(status_code=422, detail=f"{field_label} is required")
    if len(normalized_value) > max_length:
        raise HTTPException(status_code=422, detail=f"{field_label} must have at most {max_length} characters")
    return normalized_value


def normalize_optional_text(value: str | None, field_label: str, max_length: int) -> str | None:
    if value is None:
        return None

    normalized_value = value.strip()
    if not normalized_value:
        return None
    if len(normalized_value) > max_length:
        raise HTTPException(status_code=422, detail=f"{field_label} must have at most {max_length} characters")
    return normalized_value


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
    memory_text: str = Form(...),
    author_name: str | None = Form(default=None),
    author_city: str | None = Form(default=None),
    claim_token: str = Form(...),
    consent_confirmed: bool = Form(...),
    session: Session = Depends(get_session),
) -> MemoryRead:
    ensure_public_place(place_id, session)
    if not consent_confirmed:
        raise HTTPException(status_code=422, detail="Publication consent is required")

    normalized_caption = normalize_required_text(caption, "Memory caption", MAX_MEMORY_CAPTION_LENGTH)
    normalized_memory_text = normalize_required_text(memory_text, "Memory text", MAX_MEMORY_TEXT_LENGTH)
    normalized_author_name = normalize_optional_text(author_name, "Author name", MAX_MEMORY_AUTHOR_LENGTH)
    normalized_author_city = normalize_optional_text(author_city, "Author city", MAX_MEMORY_AUTHOR_LENGTH)

    token_hash = claim_token_hash(claim_token)
    stored_image = await store_uploaded_image(file, place_id, "memories")
    try:
        memory = Memory(
            place_id=place_id,
            author_name=normalized_author_name,
            author_city=normalized_author_city,
            caption=normalized_caption,
            memory_text=normalized_memory_text,
            original_path=stored_image.original_path,
            public_path=stored_image.public_path,
            thumb_path=stored_image.thumb_path,
            status="pending",
            consent_confirmed=True,
            claim_token_hash=token_hash,
        )
        session.add(memory)
        session.commit()
        session.refresh(memory)
    except SQLAlchemyError as exc:
        session.rollback()
        delete_stored_image(stored_image.original_path, stored_image.public_path, stored_image.thumb_path)
        raise HTTPException(status_code=500, detail="Memory could not be saved") from exc
    return memory_to_read(memory)


@router.post("/{memory_id}/claim", response_model=MemoryClaimRead)
def verify_place_memory_claim(
    place_id: str,
    memory_id: str,
    payload: MemoryClaimToken,
    session: Session = Depends(get_session),
) -> MemoryClaimRead:
    _, memory = get_place_memory(place_id, memory_id, session)
    require_memory_claim(memory, payload.claim_token)
    return MemoryClaimRead(can_edit=True)


@router.patch("/{memory_id}", response_model=MemoryRead)
def update_place_memory(
    place_id: str,
    memory_id: str,
    payload: MemoryUpdate,
    session: Session = Depends(get_session),
) -> MemoryRead:
    _, memory = get_place_memory(place_id, memory_id, session)
    require_memory_claim(memory, payload.claim_token)

    normalized_caption = normalize_required_text(payload.caption, "Memory caption", MAX_MEMORY_CAPTION_LENGTH)
    normalized_memory_text = normalize_required_text(payload.memory_text, "Memory text", MAX_MEMORY_TEXT_LENGTH)
    normalized_author_name = normalize_optional_text(payload.author_name, "Author name", MAX_MEMORY_AUTHOR_LENGTH)
    normalized_author_city = normalize_optional_text(payload.author_city, "Author city", MAX_MEMORY_AUTHOR_LENGTH)

    memory.caption = normalized_caption
    memory.memory_text = normalized_memory_text
    memory.author_name = normalized_author_name
    memory.author_city = normalized_author_city
    session.add(memory)
    session.commit()
    session.refresh(memory)
    return memory_to_read(memory)


@router.delete("/{memory_id}", status_code=204)
def delete_place_memory(
    place_id: str,
    memory_id: str,
    payload: MemoryClaimToken = Body(...),
    session: Session = Depends(get_session),
) -> Response:
    place, memory = get_place_memory(place_id, memory_id, session)
    require_memory_claim(memory, payload.claim_token)

    apply_memory_deleted(memory, place)
    session.delete(memory)
    session.add(place)
    session.commit()
    delete_stored_image(memory.original_path, memory.public_path, memory.thumb_path)
    return Response(status_code=204)
