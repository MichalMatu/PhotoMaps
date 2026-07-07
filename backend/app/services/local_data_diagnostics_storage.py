from __future__ import annotations

from pathlib import Path
from typing import Any

from app.services.local_data_diagnostics_common import (
    IssueList,
    add_issue,
    image_info,
    storage_empty_dirs,
    storage_files,
    total_bytes,
)


def audit_storage_roots(
    private_storage_dir: Path,
    public_storage_dir: Path,
    expected_private: set[str],
    expected_public: set[str],
    issues: IssueList,
    *,
    check_images: bool,
) -> dict[str, Any]:
    private_files = storage_files(private_storage_dir)
    public_files = storage_files(public_storage_dir)
    private_empty_dirs = storage_empty_dirs(private_storage_dir)
    public_empty_dirs = storage_empty_dirs(public_storage_dir)
    private_rel = {path.relative_to(private_storage_dir).as_posix() for path in private_files}
    public_rel = {path.relative_to(public_storage_dir).as_posix() for path in public_files}

    for relative_path in sorted(private_rel - expected_private):
        add_issue(
            issues,
            "warning",
            "orphan_private_file",
            f"private:{relative_path}",
            "Private storage file is not referenced by any media record.",
        )
    for relative_path in sorted(public_rel - expected_public):
        add_issue(
            issues,
            "warning",
            "orphan_public_file",
            f"public:{relative_path}",
            "Public storage file is not referenced by any media record.",
        )
    for path in private_empty_dirs:
        relative_path = path.relative_to(private_storage_dir).as_posix()
        add_issue(
            issues,
            "warning",
            "orphan_private_empty_dir",
            f"private:{relative_path}",
            "Private storage directory is empty and not needed by media records.",
        )
    for path in public_empty_dirs:
        relative_path = path.relative_to(public_storage_dir).as_posix()
        add_issue(
            issues,
            "warning",
            "orphan_public_empty_dir",
            f"public:{relative_path}",
            "Public storage directory is empty and not needed by media records.",
        )

    if check_images:
        for path in private_files:
            image_info(path, issues, f"private:{path.relative_to(private_storage_dir).as_posix()}")
        for path in public_files:
            image_info(path, issues, f"public:{path.relative_to(public_storage_dir).as_posix()}")

    return {
        "private_files": len(private_files),
        "public_files": len(public_files),
        "orphan_private_files": len(private_rel - expected_private),
        "orphan_public_files": len(public_rel - expected_public),
        "orphan_private_empty_dirs": len(private_empty_dirs),
        "orphan_public_empty_dirs": len(public_empty_dirs),
        "private_bytes": total_bytes(private_files),
        "public_bytes": total_bytes(public_files),
    }
