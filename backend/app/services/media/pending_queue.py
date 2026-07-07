import os
from dataclasses import dataclass

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.memory import Memory
from app.services.media import images

PUBLIC_PENDING_MEDIA_MAX_RECORDS = int(os.getenv("PHOTOMAP_PUBLIC_PENDING_MEDIA_MAX_RECORDS", "100"))
PUBLIC_PENDING_MEDIA_MAX_BYTES = int(os.getenv("PHOTOMAP_PUBLIC_PENDING_MEDIA_MAX_BYTES", str(512 * 1024 * 1024)))


@dataclass(frozen=True)
class PendingMediaQueueUsage:
    bytes: int
    records: int


def pending_public_media_usage(session: Session) -> PendingMediaQueueUsage:
    memories = session.exec(select(Memory).where(Memory.status == "pending")).all()
    pending_bytes = 0

    for media in memories:
        pending_bytes += stored_media_bytes(
            media.original_path,
            media.public_path,
            media.thumb_path,
            media.audio_original_path,
            media.audio_public_path,
        )

    return PendingMediaQueueUsage(bytes=pending_bytes, records=len(memories))


def stored_media_bytes(
    original_path: str,
    public_path: str | None,
    thumb_path: str | None,
    audio_original_path: str | None = None,
    audio_public_path: str | None = None,
) -> int:
    paths = []
    try:
        paths.append(images.storage_path(images.PRIVATE_STORAGE_DIR, original_path))
        if public_path:
            paths.append(images.public_storage_path(public_path))
        if thumb_path:
            paths.append(images.public_storage_path(thumb_path))
        if audio_original_path:
            paths.append(images.storage_path(images.PRIVATE_STORAGE_DIR, audio_original_path))
        if audio_public_path:
            paths.append(images.public_storage_path(audio_public_path))
    except ValueError:
        return 0

    return sum(path.stat().st_size for path in paths if path.exists() and path.is_file())


def ensure_public_pending_media_capacity(session: Session, incoming_bytes: int) -> None:
    usage = pending_public_media_usage(session)
    if usage.records >= PUBLIC_PENDING_MEDIA_MAX_RECORDS:
        raise HTTPException(status_code=429, detail="Pending media queue is full")
    if usage.bytes + incoming_bytes > PUBLIC_PENDING_MEDIA_MAX_BYTES:
        raise HTTPException(status_code=429, detail="Pending media queue storage limit is reached")
