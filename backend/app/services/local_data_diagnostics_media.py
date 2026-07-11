from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.services.local_data_diagnostics_common import (
    PHOTO_ROLES,
    PHOTO_SOURCES,
    PHOTO_STATUSES,
    IssueList,
    add_issue,
    image_info,
    public_relative_path,
    safe_child,
    safe_relative_path,
)


def audit_photos(
    photos: list[Photo],
    places: dict[str, Place],
    private_storage_dir: Path,
    public_storage_dir: Path,
    expected_private: set[str],
    expected_public: set[str],
    issues: IssueList,
    *,
    check_images: bool,
) -> dict[str, Any]:
    status_counts = Counter(photo.status for photo in photos)
    for photo in photos:
        target = f"photo:{photo.id}"
        if photo.place_id not in places:
            add_issue(
                issues,
                "error",
                "photo_missing_place",
                target,
                "Photo references a missing place.",
                place_id=photo.place_id,
            )
        if photo.status not in PHOTO_STATUSES:
            add_issue(
                issues, "error", "photo_bad_status", target, "Photo has an unsupported status.", status=photo.status
            )
        if photo.role not in PHOTO_ROLES:
            add_issue(issues, "error", "photo_bad_role", target, "Photo has an unsupported role.", role=photo.role)
        if photo.source not in PHOTO_SOURCES:
            add_issue(
                issues, "error", "photo_bad_source", target, "Photo has an unsupported source.", source=photo.source
            )
        if photo.status == "approved" and photo.approved_at is None:
            add_issue(
                issues,
                "warning",
                "photo_approved_without_approved_at",
                target,
                "Approved photo has no approved_at timestamp.",
            )
        if photo.status != "approved" and any(
            path is not None for path in (photo.public_path, photo.thumb_path, photo.audio_public_path)
        ):
            add_issue(
                issues,
                "error",
                "photo_nonapproved_media_is_public",
                target,
                "Pending or rejected photo has public media paths.",
            )
        audit_private_media_path(
            media_kind="photo",
            media_id=photo.id,
            relative_path=photo.original_path,
            private_storage_dir=private_storage_dir,
            expected_private=expected_private,
            issues=issues,
            check_images=check_images,
            required=photo.status != "rejected",
        )
        audit_public_media_path(
            media_kind="photo",
            media_id=photo.id,
            field="public_path",
            url_path=photo.public_path,
            public_storage_dir=public_storage_dir,
            expected_public=expected_public,
            issues=issues,
            check_images=check_images,
            required=photo.status == "approved",
        )
        audit_public_media_path(
            media_kind="photo",
            media_id=photo.id,
            field="thumb_path",
            url_path=photo.thumb_path,
            public_storage_dir=public_storage_dir,
            expected_public=expected_public,
            issues=issues,
            check_images=check_images,
            required=photo.status == "approved",
        )
        audit_audio_paths(
            media_kind="photo",
            media_id=photo.id,
            original_path=photo.audio_original_path,
            public_path=photo.audio_public_path,
            private_storage_dir=private_storage_dir,
            public_storage_dir=public_storage_dir,
            expected_private=expected_private,
            expected_public=expected_public,
            issues=issues,
            required=photo.status != "rejected",
            require_public=photo.status == "approved",
        )
    return {
        "records": len(photos),
        "approved": int(status_counts["approved"]),
        "pending": int(status_counts["pending"]),
        "rejected": int(status_counts["rejected"]),
        "unknown_status": sum(count for status, count in status_counts.items() if status not in PHOTO_STATUSES),
    }


def audit_memories(
    memories: list[Memory],
    places: dict[str, Place],
    private_storage_dir: Path,
    public_storage_dir: Path,
    expected_private: set[str],
    expected_public: set[str],
    issues: IssueList,
    *,
    check_images: bool,
) -> dict[str, Any]:
    status_counts = Counter(memory.status for memory in memories)
    share_slugs = Counter(memory.share_slug for memory in memories)
    for memory in memories:
        target = f"memory:{memory.id}"
        if memory.place_id not in places:
            add_issue(
                issues,
                "error",
                "memory_missing_place",
                target,
                "Memory references a missing place.",
                place_id=memory.place_id,
            )
        if memory.status not in PHOTO_STATUSES:
            add_issue(
                issues,
                "error",
                "memory_bad_status",
                target,
                "Memory has an unsupported status.",
                status=memory.status,
            )
        if memory.status == "approved" and memory.approved_at is None:
            add_issue(
                issues,
                "warning",
                "memory_approved_without_approved_at",
                target,
                "Approved memory has no approved_at timestamp.",
            )
        if share_slugs[memory.share_slug] > 1:
            add_issue(
                issues,
                "error",
                "memory_duplicate_share_slug",
                target,
                "Memory share slug is duplicated.",
                share_slug=memory.share_slug,
            )
        audit_private_media_path(
            media_kind="memory",
            media_id=memory.id,
            relative_path=memory.original_path,
            private_storage_dir=private_storage_dir,
            expected_private=expected_private,
            issues=issues,
            check_images=check_images,
            required=memory.status != "rejected",
        )
        audit_public_media_path(
            media_kind="memory",
            media_id=memory.id,
            field="public_path",
            url_path=memory.public_path,
            public_storage_dir=public_storage_dir,
            expected_public=expected_public,
            issues=issues,
            check_images=check_images,
            required=memory.status == "approved",
        )
        audit_public_media_path(
            media_kind="memory",
            media_id=memory.id,
            field="thumb_path",
            url_path=memory.thumb_path,
            public_storage_dir=public_storage_dir,
            expected_public=expected_public,
            issues=issues,
            check_images=check_images,
            required=memory.status == "approved",
        )
        audit_audio_paths(
            media_kind="memory",
            media_id=memory.id,
            original_path=memory.audio_original_path,
            public_path=memory.audio_public_path,
            private_storage_dir=private_storage_dir,
            public_storage_dir=public_storage_dir,
            expected_private=expected_private,
            expected_public=expected_public,
            issues=issues,
            required=memory.status != "rejected",
            require_public=memory.status == "approved",
        )
    return {
        "records": len(memories),
        "approved": int(status_counts["approved"]),
        "pending": int(status_counts["pending"]),
        "rejected": int(status_counts["rejected"]),
        "unknown_status": sum(count for status, count in status_counts.items() if status not in PHOTO_STATUSES),
    }


def audit_private_media_path(
    *,
    media_kind: str,
    media_id: str,
    relative_path: Any,
    private_storage_dir: Path,
    expected_private: set[str],
    issues: IssueList,
    check_images: bool,
    required: bool = True,
) -> None:
    target = f"{media_kind}:{media_id}:original_path"
    safe_rel = safe_relative_path(relative_path)
    if safe_rel is None:
        add_issue(
            issues,
            "error",
            f"{media_kind}_unsafe_original_path",
            target,
            "Original path is not a safe relative path.",
        )
        return
    path = safe_child(private_storage_dir, safe_rel)
    if path.exists():
        expected_private.add(safe_rel)
    elif required:
        add_issue(
            issues,
            "error",
            f"{media_kind}_original_missing",
            target,
            "Private original file is missing.",
            path=safe_rel,
        )
        return
    else:
        return
    if check_images:
        image_info(path, issues, target)


def audit_private_audio_path(
    *,
    media_kind: str,
    media_id: str,
    relative_path: Any,
    private_storage_dir: Path,
    expected_private: set[str],
    issues: IssueList,
    required: bool,
) -> None:
    target = f"{media_kind}:{media_id}:audio_original_path"
    safe_rel = safe_relative_path(relative_path)
    if safe_rel is None:
        add_issue(
            issues,
            "error",
            f"{media_kind}_unsafe_audio_original_path",
            target,
            "Audio original path is not a safe relative path.",
        )
        return
    path = safe_child(private_storage_dir, safe_rel)
    if path.exists():
        expected_private.add(safe_rel)
    elif required:
        add_issue(
            issues,
            "error",
            f"{media_kind}_audio_original_missing",
            target,
            "Private audio original file is missing.",
            path=safe_rel,
        )


def audit_public_audio_path(
    *,
    media_kind: str,
    media_id: str,
    url_path: Any,
    public_storage_dir: Path,
    expected_public: set[str],
    issues: IssueList,
) -> None:
    target = f"{media_kind}:{media_id}:audio_public_path"
    safe_rel = public_relative_path(url_path)
    if safe_rel is None:
        add_issue(
            issues,
            "error",
            f"{media_kind}_unsafe_audio_public_path",
            target,
            "Public audio URL is not under /media/.",
        )
        return
    expected_public.add(safe_rel)
    path = safe_child(public_storage_dir, safe_rel)
    if not path.exists():
        add_issue(
            issues,
            "error",
            f"{media_kind}_audio_public_missing",
            target,
            "Public audio file is missing.",
            path=safe_rel,
        )


def audit_audio_paths(
    *,
    media_kind: str,
    media_id: str,
    original_path: str | None,
    public_path: str | None,
    private_storage_dir: Path,
    public_storage_dir: Path,
    expected_private: set[str],
    expected_public: set[str],
    issues: IssueList,
    required: bool,
    require_public: bool = True,
) -> None:
    if original_path is None and public_path is None:
        return
    if original_path is None:
        add_issue(
            issues,
            "error",
            f"{media_kind}_incomplete_audio_paths",
            f"{media_kind}:{media_id}:audio",
            "Audio attachment must have a private original path.",
        )
        return
    audit_private_audio_path(
        media_kind=media_kind,
        media_id=media_id,
        relative_path=original_path,
        private_storage_dir=private_storage_dir,
        expected_private=expected_private,
        issues=issues,
        required=required,
    )
    if public_path is None and not require_public:
        return
    if public_path is None:
        add_issue(
            issues,
            "error",
            f"{media_kind}_incomplete_audio_paths",
            f"{media_kind}:{media_id}:audio",
            "Approved audio attachment must have a public path.",
        )
        return
    audit_public_audio_path(
        media_kind=media_kind,
        media_id=media_id,
        url_path=public_path,
        public_storage_dir=public_storage_dir,
        expected_public=expected_public,
        issues=issues,
    )


def audit_public_media_path(
    *,
    media_kind: str,
    media_id: str,
    field: str,
    url_path: Any,
    public_storage_dir: Path,
    expected_public: set[str],
    issues: IssueList,
    check_images: bool,
    required: bool = True,
) -> None:
    target = f"{media_kind}:{media_id}:{field}"
    safe_rel = public_relative_path(url_path)
    if safe_rel is None:
        if not required and url_path is None:
            return
        add_issue(issues, "error", f"{media_kind}_unsafe_{field}", target, "Public media URL is not under /media/.")
        return
    expected_public.add(safe_rel)
    path = safe_child(public_storage_dir, safe_rel)
    if not path.exists():
        add_issue(
            issues, "error", f"{media_kind}_{field}_missing", target, "Public media file is missing.", path=safe_rel
        )
        return
    if check_images:
        image_info(path, issues, target)
