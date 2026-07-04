from app.models.memory import Memory
from app.schemas.memory import MemoryAdminRead, MemoryRead
from app.serializers.audio import audio_to_read


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
        audio=audio_to_read(memory) if memory.status == "approved" else None,
    )


def memory_to_admin_read(memory: Memory) -> MemoryAdminRead:
    public_memory = memory_to_read(memory)
    return MemoryAdminRead(
        **public_memory.model_dump(exclude={"audio"}),
        audio=audio_to_read(memory),
        status=memory.status,
        paid=memory.paid,
        share_slug=memory.share_slug,
        consent_confirmed=memory.consent_confirmed,
        created_at=memory.created_at,
        approved_at=memory.approved_at,
    )
