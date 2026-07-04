from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Response, UploadFile
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.memory import Memory
from app.models.place import Place
from app.schemas.memory import MemoryClaimRead, MemoryClaimToken, MemoryRead, MemoryUpdate
from app.serializers.memory import memory_to_read
from app.services.memory_fields import (
    MAX_MEMORY_AUTHOR_LENGTH,
    MAX_MEMORY_CAPTION_LENGTH,
    MAX_MEMORY_TEXT_LENGTH,
    normalize_optional_text,
    normalize_required_text,
)
from app.services.memory_uploads import create_memory_from_upload, delete_memory_files
from app.services.places import ensure_public_place
from app.services.review import apply_memory_deleted
from app.services.tokens import verify_claim_token

router = APIRouter(prefix="/api/places/{place_id}/memories", tags=["memories"])


def get_place_memory(place_id: str, memory_id: str, session: Session) -> tuple[Place, Memory]:
    place = ensure_public_place(place_id, session)
    memory = session.get(Memory, memory_id)
    if memory is None or memory.place_id != place.id:
        raise HTTPException(status_code=404, detail="Memory not found")
    return place, memory


def require_memory_claim(memory: Memory, claim_token: str) -> None:
    if not memory.claim_token_hash or not verify_claim_token(claim_token, memory.claim_token_hash):
        raise HTTPException(status_code=403, detail="Invalid memory token")


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


@router.get("/{memory_id}", response_model=MemoryRead)
def get_public_place_memory(place_id: str, memory_id: str, session: Session = Depends(get_session)) -> MemoryRead:
    place = ensure_public_place(place_id, session)
    memory = session.get(Memory, memory_id)
    if memory is None or memory.place_id != place.id or memory.status != "approved":
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory_to_read(memory)


@router.post("", response_model=MemoryRead, status_code=201)
async def upload_place_memory(
    place_id: str,
    file: UploadFile = File(...),
    audio_file: UploadFile | None = File(default=None),
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

    memory = await create_memory_from_upload(
        audio_file=audio_file,
        author_city=normalized_author_city,
        author_name=normalized_author_name,
        caption=normalized_caption,
        claim_token=claim_token,
        file=file,
        memory_text=normalized_memory_text,
        place_id=place_id,
        session=session,
    )
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
    delete_memory_files(memory)
    return Response(status_code=204)
