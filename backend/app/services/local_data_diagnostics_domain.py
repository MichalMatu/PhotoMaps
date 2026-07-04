from __future__ import annotations

from collections import Counter
from typing import Any

from sqlmodel import Session, select

from app.models.category import Category
from app.models.city import City
from app.models.guide import Guide
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.models.report import Report
from app.services.local_data_diagnostics_common import (
    CATEGORY_STATUSES,
    CITY_STATUSES,
    GUIDE_STATUSES,
    PLACE_STATUSES,
    REPORT_STATUSES,
    REPORT_TARGET_TYPES,
    IssueList,
    add_issue,
    is_coord,
)


def audit_places(
    places: dict[str, Place],
    photos: list[Photo],
    memories: list[Memory],
    issues: IssueList,
) -> dict[str, Any]:
    approved_photos_by_place = Counter(photo.place_id for photo in photos if photo.status == "approved")
    approved_memories_by_place = Counter(memory.place_id for memory in memories if memory.status == "approved")
    photos_by_id = {photo.id: photo for photo in photos}
    status_counts = Counter(place.status for place in places.values())
    for place in places.values():
        target = f"place:{place.id}"
        if place.status not in PLACE_STATUSES:
            add_issue(
                issues, "error", "place_bad_status", target, "Place has an unsupported status.", status=place.status
            )
        if not is_coord(place.lat, -90, 90) or not is_coord(place.lon, -180, 180):
            add_issue(issues, "error", "place_bad_coordinates", target, "Place coordinates are invalid.")
        actual_photo_count = int(approved_photos_by_place[place.id])
        if place.photo_count != actual_photo_count:
            add_issue(
                issues,
                "error",
                "place_photo_count_mismatch",
                target,
                "Place photo_count does not match approved photos.",
                stored_count=place.photo_count,
                actual_count=actual_photo_count,
            )
        actual_memory_count = int(approved_memories_by_place[place.id])
        if place.memory_count != actual_memory_count:
            add_issue(
                issues,
                "error",
                "place_memory_count_mismatch",
                target,
                "Place memory_count does not match approved memories.",
                stored_count=place.memory_count,
                actual_count=actual_memory_count,
            )
        if place.cover_photo_id:
            cover_photo = photos_by_id.get(place.cover_photo_id)
            if cover_photo is None:
                add_issue(
                    issues,
                    "error",
                    "place_cover_missing",
                    target,
                    "Place cover_photo_id references a missing photo.",
                )
            elif cover_photo.place_id != place.id:
                add_issue(
                    issues,
                    "error",
                    "place_cover_wrong_place",
                    target,
                    "Place cover photo belongs to another place.",
                )
            elif cover_photo.status != "approved":
                add_issue(issues, "error", "place_cover_not_approved", target, "Place cover photo is not approved.")
    return {
        "records": len(places),
        "published": int(status_counts["published"]),
        "draft": int(status_counts["draft"]),
        "archived": int(status_counts["archived"]),
        "unknown_status": sum(count for status, count in status_counts.items() if status not in PLACE_STATUSES),
    }


def audit_reference_statuses(
    session: Session,
    places: dict[str, Place],
    photos: list[Photo],
    memories: list[Memory],
    issues: IssueList,
) -> dict[str, Any]:
    counts: dict[str, int] = {}
    audit_status_table(session.exec(select(City)).all(), CITY_STATUSES, "city", issues, counts)
    audit_status_table(session.exec(select(Category)).all(), CATEGORY_STATUSES, "category", issues, counts)
    guides = session.exec(select(Guide)).all()
    audit_status_table(guides, GUIDE_STATUSES, "guide", issues, counts)

    target_ids = {
        "place": set(places),
        "photo": {photo.id for photo in photos},
        "memory": {memory.id for memory in memories},
        "guide": {guide.id for guide in guides},
    }
    reports = session.exec(select(Report)).all()
    counts["reports"] = len(reports)
    for report in reports:
        target = f"report:{report.id}"
        if report.status not in REPORT_STATUSES:
            add_issue(
                issues,
                "error",
                "report_bad_status",
                target,
                "Report has an unsupported status.",
                status=report.status,
            )
        if report.target_type not in REPORT_TARGET_TYPES:
            add_issue(
                issues,
                "error",
                "report_bad_target_type",
                target,
                "Report has an unsupported target type.",
                target_type=report.target_type,
            )
            continue
        if report.target_id not in target_ids[report.target_type]:
            add_issue(issues, "error", "report_missing_target", target, "Report target does not exist.")
    return counts


def audit_status_table(
    records: list[Any],
    allowed_statuses: set[str],
    label: str,
    issues: IssueList,
    counts: dict[str, int],
) -> None:
    counts[f"{label}s"] = len(records)
    for record in records:
        status = str(record.status)
        if status not in allowed_statuses:
            add_issue(
                issues,
                "error",
                f"{label}_bad_status",
                f"{label}:{record.id}",
                f"{label.capitalize()} has an unsupported status.",
                status=status,
            )
