from __future__ import annotations

import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

from sqlmodel import Session

from app.models.photo import Photo
from app.services.media import images

QUARANTINE_RELATIVE_ROOT = Path(".quarantine") / "photo-public"
MANIFEST_NAME = "manifest.json"
MANIFEST_VERSION = 1


@dataclass(frozen=True)
class QuarantinedPublicFile:
    public_path: str
    quarantine_path: Path


@dataclass(frozen=True)
class PhotoMediaQuarantine:
    photo_id: str
    directory: Path
    entries: tuple[QuarantinedPublicFile, ...]


def quarantine_root() -> Path:
    return images.storage_path(images.PRIVATE_STORAGE_DIR, QUARANTINE_RELATIVE_ROOT.as_posix())


def photo_public_paths(photo: Photo) -> tuple[str, ...]:
    return tuple(
        dict.fromkeys(
            path for path in (photo.public_path, photo.thumb_path, photo.audio_public_path) if path is not None
        )
    )


def quarantine_photo_public_media(photo: Photo) -> PhotoMediaQuarantine | None:
    public_paths = photo_public_paths(photo)
    if not public_paths:
        return None

    source_paths = {public_path: images.public_storage_path(public_path) for public_path in public_paths}
    directory = quarantine_root() / uuid4().hex
    directory.mkdir(parents=True, exist_ok=False)
    fsync_directory(directory.parent)
    entries = tuple(
        QuarantinedPublicFile(
            public_path=public_path,
            quarantine_path=directory / f"{index:02d}{Path(public_path).suffix}",
        )
        for index, public_path in enumerate(public_paths)
    )
    quarantine = PhotoMediaQuarantine(photo_id=photo.id, directory=directory, entries=entries)

    try:
        write_manifest(quarantine)
        for entry in entries:
            source_path = source_paths[entry.public_path]
            if not source_path.exists():
                continue
            if not source_path.is_file():
                raise OSError(f"Public photo media path is not a file: {entry.public_path}")
            os.replace(source_path, entry.quarantine_path)
            fsync_directory(source_path.parent)
            fsync_directory(entry.quarantine_path.parent)
    except (OSError, ValueError):
        restore_photo_media_quarantine(quarantine)
        raise

    return quarantine


def restore_photo_media_quarantine(quarantine: PhotoMediaQuarantine) -> None:
    restore_error: OSError | ValueError | None = None
    for entry in quarantine.entries:
        if not entry.quarantine_path.exists():
            continue
        try:
            public_path = images.public_storage_path(entry.public_path)
            public_path.parent.mkdir(parents=True, exist_ok=True)
            if public_path.exists():
                entry.quarantine_path.unlink()
                fsync_directory(entry.quarantine_path.parent)
            else:
                os.replace(entry.quarantine_path, public_path)
                fsync_directory(entry.quarantine_path.parent)
                fsync_directory(public_path.parent)
        except (OSError, ValueError) as exc:
            restore_error = restore_error or exc

    if restore_error is None:
        discard_photo_media_quarantine(quarantine)
        return
    raise restore_error


def discard_photo_media_quarantine(quarantine: PhotoMediaQuarantine) -> None:
    if not quarantine.directory.exists():
        return
    parent = quarantine.directory.parent
    shutil.rmtree(quarantine.directory, ignore_errors=False)
    fsync_directory(parent)
    cleanup_empty_quarantine_parents(parent)


def write_manifest(quarantine: PhotoMediaQuarantine) -> None:
    payload = {
        "version": MANIFEST_VERSION,
        "photo_id": quarantine.photo_id,
        "entries": [
            {
                "public_path": entry.public_path,
                "quarantine_name": entry.quarantine_path.name,
            }
            for entry in quarantine.entries
        ],
    }
    temporary_path = quarantine.directory / f".{MANIFEST_NAME}.tmp"
    manifest_path = quarantine.directory / MANIFEST_NAME
    with temporary_path.open("x", encoding="utf-8") as manifest_file:
        json.dump(payload, manifest_file, ensure_ascii=False, separators=(",", ":"))
        manifest_file.flush()
        os.fsync(manifest_file.fileno())
    os.replace(temporary_path, manifest_path)
    fsync_directory(quarantine.directory)


def load_manifest(manifest_path: Path) -> PhotoMediaQuarantine:
    try:
        payload: Any = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Photo media quarantine manifest is invalid: {manifest_path}") from exc

    if not isinstance(payload, dict) or payload.get("version") != MANIFEST_VERSION:
        raise RuntimeError(f"Photo media quarantine manifest has an unsupported version: {manifest_path}")
    photo_id = payload.get("photo_id")
    raw_entries = payload.get("entries")
    if not isinstance(photo_id, str) or not photo_id or not isinstance(raw_entries, list):
        raise RuntimeError(f"Photo media quarantine manifest is incomplete: {manifest_path}")

    entries: list[QuarantinedPublicFile] = []
    for raw_entry in raw_entries:
        if not isinstance(raw_entry, dict):
            raise RuntimeError(f"Photo media quarantine manifest entry is invalid: {manifest_path}")
        public_path = raw_entry.get("public_path")
        quarantine_name = raw_entry.get("quarantine_name")
        if (
            not isinstance(public_path, str)
            or not isinstance(quarantine_name, str)
            or Path(quarantine_name).name != quarantine_name
        ):
            raise RuntimeError(f"Photo media quarantine manifest entry is unsafe: {manifest_path}")
        try:
            images.public_storage_path(public_path)
        except ValueError as exc:
            raise RuntimeError(f"Photo media quarantine public path is unsafe: {manifest_path}") from exc
        entries.append(
            QuarantinedPublicFile(
                public_path=public_path,
                quarantine_path=manifest_path.parent / quarantine_name,
            )
        )

    return PhotoMediaQuarantine(photo_id=photo_id, directory=manifest_path.parent, entries=tuple(entries))


def recover_photo_media_quarantines(session: Session) -> dict[str, int]:
    root = quarantine_root()
    if not root.exists():
        return {"discarded": 0, "restored": 0}

    discarded = 0
    restored = 0
    operation_directories = sorted(path for path in root.iterdir() if path.is_dir())
    for directory in operation_directories:
        manifest_path = directory / MANIFEST_NAME
        if not manifest_path.is_file():
            unsafe_residue = [path for path in directory.iterdir() if path.name != f".{MANIFEST_NAME}.tmp"]
            if unsafe_residue:
                raise RuntimeError(f"Photo media quarantine is missing its manifest: {directory}")
            shutil.rmtree(directory)
            discarded += 1
            continue

        quarantine = load_manifest(manifest_path)
        photo = session.get(Photo, quarantine.photo_id)
        current_paths = set(photo_public_paths(photo)) if photo is not None else set()
        quarantine_paths = {entry.public_path for entry in quarantine.entries}
        should_restore = (
            photo is not None
            and photo.status == "approved"
            and bool(current_paths)
            and quarantine_paths.issubset(current_paths)
        )
        if should_restore:
            restore_photo_media_quarantine(quarantine)
            restored += 1
        else:
            discard_photo_media_quarantine(quarantine)
            discarded += 1

    cleanup_empty_quarantine_parents(root)
    return {"discarded": discarded, "restored": restored}


def cleanup_empty_quarantine_parents(start: Path) -> None:
    root = quarantine_root()
    current = start
    while current == root or root in current.parents:
        try:
            current.rmdir()
        except OSError:
            break
        if current == root:
            break
        current = current.parent


def fsync_directory(path: Path) -> None:
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
