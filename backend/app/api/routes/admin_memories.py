from io import BytesIO
from mimetypes import guess_type

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.api.pagination import ADMIN_QUEUE_DEFAULT_LIMIT, ADMIN_QUEUE_MAX_LIMIT
from app.api.redaction import redact_admin_media
from app.db.session import get_session
from app.models.memory import Memory
from app.models.place import Place
from app.schemas.contract_types import ReviewStatus
from app.schemas.media_redaction import MediaRedactionPayload, MediaRedactionReport
from app.schemas.memory import MemoryAdminRead, MemoryAdminUpdate, MemoryReview
from app.serializers.memory import memory_to_admin_read
from app.services.media import images
from app.services.memory_fields import (
    MAX_MEMORY_AUTHOR_LENGTH,
    MAX_MEMORY_CAPTION_LENGTH,
    MAX_MEMORY_TEXT_LENGTH,
    normalize_optional_text,
    normalize_required_text,
)
from app.services.memory_uploads import delete_memory_audio, delete_memory_files, replace_memory_audio
from app.services.review import (
    apply_memory_deleted,
    ensure_final_review_status,
    ensure_visible_review_status,
    review_memory,
)

router = APIRouter(prefix="/api/admin/memories", tags=["admin memories"], dependencies=[Depends(require_admin_token)])


def admin_memory_or_404(memory_id: str, session: Session) -> Memory:
    memory = session.get(Memory, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


def private_memory_image_path(memory: Memory):
    path = images.storage_path(images.PRIVATE_STORAGE_DIR, memory.original_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Memory media not found")
    return path


def thumbnail_response(memory: Memory) -> Response:
    path = private_memory_image_path(memory)
    try:
        with Image.open(path) as image:
            output_format = images.public_image_format(image)
            output_image = images.normalized_public_image(image, output_format)
            thumb_image = ImageOps.fit(
                output_image,
                images.THUMB_SIZE,
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            buffer = BytesIO()
            if output_format == "PNG":
                thumb_image.save(buffer, "PNG", optimize=True)
                media_type = "image/png"
            else:
                thumb_image.save(
                    buffer,
                    "JPEG",
                    quality=images.THUMB_IMAGE_QUALITY,
                    subsampling=images.THUMB_JPEG_SUBSAMPLING,
                    optimize=True,
                )
                media_type = "image/jpeg"
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=422, detail="Memory media could not be processed") from exc

    return Response(content=buffer.getvalue(), media_type=media_type)


@router.get("", response_model=list[MemoryAdminRead])
def list_admin_memories(
    status: ReviewStatus | None = Query(default=None),
    limit: int = Query(default=ADMIN_QUEUE_DEFAULT_LIMIT, ge=1, le=ADMIN_QUEUE_MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
) -> list[MemoryAdminRead]:
    if status is not None:
        ensure_visible_review_status(status)

    statement = select(Memory).join(Place, Memory.place_id == Place.id).order_by(Memory.created_at.desc())
    if status is not None:
        statement = statement.where(Memory.status == status)

    return [memory_to_admin_read(memory) for memory in session.exec(statement.offset(offset).limit(limit)).all()]


@router.get("/{memory_id}/media/image")
def get_memory_admin_image(memory_id: str, session: Session = Depends(get_session)) -> FileResponse:
    memory = admin_memory_or_404(memory_id, session)
    path = private_memory_image_path(memory)
    media_type = guess_type(path.name)[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type)


@router.get("/{memory_id}/media/thumb")
def get_memory_admin_thumbnail(memory_id: str, session: Session = Depends(get_session)) -> Response:
    memory = admin_memory_or_404(memory_id, session)
    return thumbnail_response(memory)


@router.get("/{memory_id}/media/audio")
def get_memory_admin_audio(memory_id: str, session: Session = Depends(get_session)) -> FileResponse:
    memory = admin_memory_or_404(memory_id, session)
    if memory.audio_original_path is None:
        raise HTTPException(status_code=404, detail="Memory audio not found")
    path = images.storage_path(images.PRIVATE_STORAGE_DIR, memory.audio_original_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Memory audio not found")
    return FileResponse(path, media_type=memory.audio_mime_type or "application/octet-stream")


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


@router.put("/{memory_id}/audio", response_model=MemoryAdminRead)
async def replace_memory_audio_attachment(
    memory_id: str,
    audio_file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> MemoryAdminRead:
    memory = session.get(Memory, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")

    return memory_to_admin_read(await replace_memory_audio(memory, audio_file, session))


@router.delete("/{memory_id}/audio", response_model=MemoryAdminRead)
def delete_memory_audio_attachment(memory_id: str, session: Session = Depends(get_session)) -> MemoryAdminRead:
    memory = session.get(Memory, memory_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Memory not found")

    return memory_to_admin_read(delete_memory_audio(memory, session))


@router.post("/{memory_id}/redaction", response_model=MediaRedactionReport)
def redact_memory(
    memory_id: str,
    payload: MediaRedactionPayload,
    session: Session = Depends(get_session),
) -> MediaRedactionReport:
    report = redact_admin_media("memory", memory_id, payload, session)
    return report


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
    delete_memory_files(memory)
    return None
