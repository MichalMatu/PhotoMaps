from app.schemas.content import ContentBlock


def content_blocks_for_storage(blocks: list[ContentBlock]) -> list[dict[str, str]]:
    return [block.model_dump(exclude_none=True) for block in blocks]
