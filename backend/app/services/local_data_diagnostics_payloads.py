from __future__ import annotations

from typing import Any

from sqlmodel import Session

from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.serializers.memory import memory_to_read
from app.serializers.photo import photo_to_read
from app.serializers.place import memory_to_map_preview, photo_to_map_preview, place_to_read
from app.services.app_config import get_place_custom_field_definitions
from app.services.local_data_diagnostics_common import PRIVATE_PAYLOAD_KEYS, IssueList, add_issue


def audit_public_payloads(
    session: Session,
    places: dict[str, Place],
    photos: list[Photo],
    memories: list[Memory],
    issues: IssueList,
) -> dict[str, Any]:
    checked = 0
    custom_field_definitions = get_place_custom_field_definitions(session)
    for photo in photos:
        if photo.status != "approved" or photo.public_path is None or photo.thumb_path is None:
            continue
        checked += 1
        audit_payload(photo_to_read(photo).model_dump(mode="json"), f"public-photo:{photo.id}", issues)
        audit_payload(photo_to_map_preview(photo).model_dump(mode="json"), f"map-photo:{photo.id}", issues)
    for memory in memories:
        if memory.status != "approved":
            continue
        checked += 1
        audit_payload(memory_to_read(memory).model_dump(mode="json"), f"public-memory:{memory.id}", issues)
        audit_payload(memory_to_map_preview(memory).model_dump(mode="json"), f"map-memory:{memory.id}", issues)
    for place in places.values():
        if place.status != "published":
            continue
        checked += 1
        audit_payload(
            place_to_read(place, [], custom_field_definitions).model_dump(mode="json"),
            f"public-place:{place.id}",
            issues,
        )
    return {"checked": checked}


def audit_payload(payload: Any, target: str, issues: IssueList) -> None:
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key in PRIVATE_PAYLOAD_KEYS:
                add_issue(
                    issues,
                    "error",
                    "public_payload_private_key",
                    target,
                    "Public payload includes a private key.",
                    key=key,
                )
            audit_payload(value, target, issues)
        return
    if isinstance(payload, list):
        for value in payload:
            audit_payload(value, target, issues)
