from pathlib import Path

import pytest

from app.models.photo import Photo
from app.services import photo_media_quarantine as quarantine_service
from app.services.photo_media_quarantine import (
    quarantine_photo_public_media,
    recover_photo_media_quarantines,
    restore_photo_media_quarantine,
)
from app.tests.support import create_place


def approved_photo_with_public_files(session, tmp_path: Path) -> tuple[Photo, dict[str, Path]]:
    place = create_place(session)
    photo = Photo(
        place_id=place.id,
        original_path=f"photos/{place.id}/photo-original.jpg",
        public_path=f"/media/photos/{place.id}/photo.jpg",
        thumb_path=f"/media/photos/{place.id}/photo-thumb.jpg",
        audio_original_path=f"photos/{place.id}/photo-audio-original.mp3",
        audio_public_path=f"/media/photos/{place.id}/photo-audio.mp3",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=5,
        audio_duration_seconds=1,
        status="approved",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    public_root = tmp_path / "public"
    files: dict[str, Path] = {}
    for public_path, content in (
        (photo.public_path, b"image"),
        (photo.thumb_path, b"thumb"),
        (photo.audio_public_path, b"audio"),
    ):
        assert public_path is not None
        path = public_root / public_path.removeprefix("/media/")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        files[public_path] = path
    return photo, files


def test_photo_media_quarantine_atomically_hides_and_restores_public_files(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    photo, files = approved_photo_with_public_files(session, tmp_path)

    quarantine = quarantine_photo_public_media(photo)

    assert quarantine is not None
    assert quarantine.directory.is_dir()
    assert (quarantine.directory / "manifest.json").is_file()
    assert not any(path.exists() for path in files.values())
    assert {path.read_bytes() for path in quarantine.directory.iterdir() if path.name != "manifest.json"} == {
        b"image",
        b"thumb",
        b"audio",
    }

    restore_photo_media_quarantine(quarantine)
    restore_photo_media_quarantine(quarantine)

    assert {public_path: path.read_bytes() for public_path, path in files.items()} == {
        photo.public_path: b"image",
        photo.thumb_path: b"thumb",
        photo.audio_public_path: b"audio",
    }
    assert not quarantine.directory.exists()


def test_photo_media_quarantine_restores_partial_move_on_filesystem_error(
    client_session,
    tmp_path: Path,
    monkeypatch,
) -> None:
    _client, session = client_session
    photo, files = approved_photo_with_public_files(session, tmp_path)
    real_replace = quarantine_service.os.replace
    failed_once = False

    def fail_second_public_move(source, destination) -> None:
        nonlocal failed_once
        source_path = Path(source)
        if not failed_once and source_path == files[photo.thumb_path]:
            failed_once = True
            raise OSError("simulated atomic rename failure")
        real_replace(source, destination)

    monkeypatch.setattr(quarantine_service.os, "replace", fail_second_public_move)

    with pytest.raises(OSError, match="simulated atomic rename failure"):
        quarantine_photo_public_media(photo)

    assert failed_once is True
    assert all(path.is_file() for path in files.values())
    assert not (tmp_path / "private" / ".quarantine" / "photo-public").exists()


def test_startup_recovery_restores_quarantine_after_precommit_crash(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    photo, files = approved_photo_with_public_files(session, tmp_path)
    quarantine = quarantine_photo_public_media(photo)
    assert quarantine is not None

    report = recover_photo_media_quarantines(session)
    second_report = recover_photo_media_quarantines(session)

    assert report == {"discarded": 0, "restored": 1}
    assert second_report == {"discarded": 0, "restored": 0}
    assert all(path.is_file() for path in files.values())
    assert not quarantine.directory.exists()


def test_startup_recovery_discards_quarantine_after_committed_rejection_crash(
    client_session,
    tmp_path: Path,
) -> None:
    _client, session = client_session
    photo, files = approved_photo_with_public_files(session, tmp_path)
    quarantine = quarantine_photo_public_media(photo)
    assert quarantine is not None

    photo.status = "rejected"
    photo.public_path = None
    photo.thumb_path = None
    photo.audio_public_path = None
    session.add(photo)
    session.commit()

    report = recover_photo_media_quarantines(session)
    second_report = recover_photo_media_quarantines(session)

    assert report == {"discarded": 1, "restored": 0}
    assert second_report == {"discarded": 0, "restored": 0}
    assert not any(path.exists() for path in files.values())
    assert not quarantine.directory.exists()


def test_startup_recovery_preserves_unmanifested_quarantine_fail_closed(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    operation_directory = tmp_path / "private" / ".quarantine" / "photo-public" / "incomplete-operation"
    quarantined_file = operation_directory / "00.jpg"
    quarantined_file.parent.mkdir(parents=True)
    quarantined_file.write_bytes(b"private-media")

    with pytest.raises(RuntimeError, match="missing its manifest"):
        recover_photo_media_quarantines(session)

    assert quarantined_file.read_bytes() == b"private-media"
