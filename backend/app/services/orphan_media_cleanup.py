from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from typing import Any

from sqlmodel import Session

from app.core.config import PRIVATE_STORAGE_DIR, PUBLIC_STORAGE_DIR
from app.services.local_data_diagnostics import run_local_data_diagnostics
from app.services.local_data_diagnostics_common import safe_child, safe_relative_path

OrphanCodeMap = Mapping[str, tuple[str, Path, str]]


def default_orphan_codes(private_storage_dir: Path, public_storage_dir: Path) -> dict[str, tuple[str, Path, str]]:
    return {
        "orphan_private_file": ("private", private_storage_dir, "delete_file"),
        "orphan_public_file": ("public", public_storage_dir, "delete_file"),
        "orphan_private_empty_dir": ("private", private_storage_dir, "delete_empty_dir"),
        "orphan_public_empty_dir": ("public", public_storage_dir, "delete_empty_dir"),
    }


def run_configured_local_data_diagnostics(
    session: Session,
    *,
    check_images: bool = True,
    private_storage_dir: Path | None = None,
    public_storage_dir: Path | None = None,
) -> dict[str, Any]:
    return run_local_data_diagnostics(
        session,
        private_storage_dir=private_storage_dir or PRIVATE_STORAGE_DIR,
        public_storage_dir=public_storage_dir or PUBLIC_STORAGE_DIR,
        check_images=check_images,
    )


def orphan_actions_from_diagnostics(
    diagnostics: dict[str, Any],
    *,
    orphan_codes: OrphanCodeMap | None = None,
    private_storage_dir: Path | None = None,
    public_storage_dir: Path | None = None,
) -> list[dict[str, Any]]:
    codes = orphan_codes or default_orphan_codes(
        private_storage_dir or PRIVATE_STORAGE_DIR,
        public_storage_dir or PUBLIC_STORAGE_DIR,
    )
    actions: list[dict[str, Any]] = []
    for issue in diagnostics.get("issues", []):
        code = issue.get("code")
        target = str(issue.get("target", ""))
        if code not in codes:
            continue
        storage_kind, root, action_type = codes[code]
        prefix = f"{storage_kind}:"
        if not target.startswith(prefix):
            continue
        relative_path = safe_relative_path(target.removeprefix(prefix))
        if relative_path is None:
            continue
        actions.append(
            {
                "action": action_type,
                "applied": False,
                "path": safe_child(root, relative_path).as_posix(),
                "relative_path": relative_path,
                "storage": storage_kind,
            }
        )
    return actions


def apply_orphan_actions(actions: list[dict[str, Any]]) -> None:
    for action in actions:
        path = Path(action["path"])
        if not path.exists():
            action["applied"] = False
            action["status"] = "missing"
            continue
        if action["action"] == "delete_file":
            if not path.is_file():
                action["applied"] = False
                action["status"] = "not-file"
                continue
            path.unlink()
        elif action["action"] == "delete_empty_dir":
            if not path.is_dir():
                action["applied"] = False
                action["status"] = "not-dir"
                continue
            try:
                path.rmdir()
            except OSError:
                action["applied"] = False
                action["status"] = "not-empty"
                continue
        else:
            action["applied"] = False
            action["status"] = "unsupported"
            continue
        action["applied"] = True
        action["status"] = "deleted"


def cleanup_empty_parent_dirs(
    actions: list[dict[str, Any]],
    *,
    private_storage_dir: Path | None = None,
    public_storage_dir: Path | None = None,
) -> None:
    roots = {
        (private_storage_dir or PRIVATE_STORAGE_DIR).resolve(),
        (public_storage_dir or PUBLIC_STORAGE_DIR).resolve(),
    }
    for action in actions:
        if not action.get("applied"):
            continue
        directory = Path(action["path"]).parent
        while directory.resolve() not in roots:
            try:
                directory.rmdir()
            except OSError:
                break
            directory = directory.parent


def cleanup_orphan_media_report(
    session: Session,
    *,
    apply_changes: bool,
    check_images: bool = True,
    private_storage_dir: Path | None = None,
    public_storage_dir: Path | None = None,
) -> dict[str, Any]:
    private_root = private_storage_dir or PRIVATE_STORAGE_DIR
    public_root = public_storage_dir or PUBLIC_STORAGE_DIR
    before = run_configured_local_data_diagnostics(
        session,
        check_images=check_images,
        private_storage_dir=private_root,
        public_storage_dir=public_root,
    )
    actions = orphan_actions_from_diagnostics(
        before,
        private_storage_dir=private_root,
        public_storage_dir=public_root,
    )
    error_count = before["summary"]["issues"]["by_severity"]["error"]
    after = None

    if apply_changes and error_count == 0:
        apply_orphan_actions(actions)
        cleanup_empty_parent_dirs(
            actions,
            private_storage_dir=private_root,
            public_storage_dir=public_root,
        )
        after = run_configured_local_data_diagnostics(
            session,
            check_images=check_images,
            private_storage_dir=private_root,
            public_storage_dir=public_root,
        )

    effective_diagnostics = after or before
    return {
        "mode": "apply" if apply_changes else "dry-run",
        "status": effective_diagnostics["status"],
        "actions": actions,
        "diagnostics": effective_diagnostics,
        "diagnostics_before": before if after else None,
    }
