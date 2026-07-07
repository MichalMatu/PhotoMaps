from app.models.memory import Memory
from app.schemas.audio import AudioAttachment
from app.schemas.memory import MemoryAdminRead, MemoryRead, MemorySubmissionRead
from app.serializers.audio import audio_to_read


def memory_admin_media_path(memory: Memory, media: str) -> str:
    return f"/api/admin/memories/{memory.id}/media/{media}"


def memory_to_read(memory: Memory) -> MemoryRead:
    if memory.public_path is None or memory.thumb_path is None:
        raise ValueError("Public memory media is not published")
    return MemoryRead(
        id=memory.id,
        place_id=memory.place_id,
        author_name=memory.author_name,
        author_city=memory.author_city,
        caption=memory.caption,
        memory_text=memory.memory_text,
        public_path=memory.public_path,
        thumb_path=memory.thumb_path,
        audio=audio_to_read(memory) if memory.status == "approved" else None,
    )


def memory_to_submission_read(memory: Memory) -> MemorySubmissionRead:
    return MemorySubmissionRead(
        id=memory.id,
        place_id=memory.place_id,
        author_name=memory.author_name,
        author_city=memory.author_city,
        caption=memory.caption,
        memory_text=memory.memory_text,
        status=memory.status,
        created_at=memory.created_at,
    )


def memory_admin_audio_to_read(memory: Memory) -> AudioAttachment | None:
    if (
        memory.audio_original_path is None
        or memory.audio_mime_type is None
        or memory.audio_size_bytes is None
        or memory.audio_duration_seconds is None
    ):
        return None

    return AudioAttachment(
        public_path=memory_admin_media_path(memory, "audio"),
        mime_type=memory.audio_mime_type,
        size_bytes=memory.audio_size_bytes,
        duration_seconds=memory.audio_duration_seconds,
    )


def memory_to_admin_read(memory: Memory) -> MemoryAdminRead:
    return MemoryAdminRead(
        id=memory.id,
        place_id=memory.place_id,
        author_name=memory.author_name,
        author_city=memory.author_city,
        caption=memory.caption,
        memory_text=memory.memory_text,
        public_path=memory.public_path,
        thumb_path=memory.thumb_path,
        admin_public_path=memory_admin_media_path(memory, "image"),
        admin_thumb_path=memory_admin_media_path(memory, "thumb"),
        audio=audio_to_read(memory) if memory.status == "approved" else None,
        admin_audio=memory_admin_audio_to_read(memory),
        status=memory.status,
        paid=memory.paid,
        share_slug=memory.share_slug,
        consent_confirmed=memory.consent_confirmed,
        created_at=memory.created_at,
        approved_at=memory.approved_at,
    )
