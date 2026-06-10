from app.models.memory import Memory
from app.schemas.memory import MemoryAdminRead, MemoryRead


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


def memory_to_admin_read(memory: Memory) -> MemoryAdminRead:
    public_memory = memory_to_read(memory)
    return MemoryAdminRead(**public_memory.model_dump(), consent_confirmed=memory.consent_confirmed)
