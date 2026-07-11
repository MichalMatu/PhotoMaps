from pathlib import Path

from app.models.photo import Photo
from app.services.photo_privacy_cleanup import run_photo_public_media_cleanup
from app.tests.support import create_place


def write_file(root: Path, relative_path: str, content: bytes = b"media") -> Path:
    path = root / relative_path.removeprefix("/media/")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def test_nonapproved_photo_cleanup_is_dry_run_by_default_and_idempotent(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    rejected = Photo(
        place_id=place.id,
        original_path=f"photos/{place.id}/rejected-original.jpg",
        public_path=f"/media/photos/{place.id}/rejected.jpg",
        thumb_path=f"/media/photos/{place.id}/rejected-thumb.jpg",
        audio_original_path=f"photos/{place.id}/rejected-audio-original.mp3",
        audio_public_path=f"/media/photos/{place.id}/rejected-audio.mp3",
        status="rejected",
    )
    pending = Photo(
        place_id=place.id,
        original_path=f"photos/{place.id}/pending-original.jpg",
        public_path=f"/media/photos/{place.id}/pending.jpg",
        thumb_path=f"/media/photos/{place.id}/pending-thumb.jpg",
        status="pending",
    )
    approved = Photo(
        place_id=place.id,
        original_path=f"photos/{place.id}/approved-original.jpg",
        public_path=f"/media/photos/{place.id}/approved.jpg",
        thumb_path=f"/media/photos/{place.id}/approved-thumb.jpg",
        status="approved",
    )
    session.add(rejected)
    session.add(pending)
    session.add(approved)
    session.commit()

    public_root = tmp_path / "public"
    candidate_paths = [
        write_file(public_root, path)
        for path in (
            rejected.public_path,
            rejected.thumb_path,
            rejected.audio_public_path,
            pending.public_path,
            pending.thumb_path,
        )
        if path is not None
    ]
    approved_path = write_file(public_root, approved.public_path)
    approved_thumb_path = write_file(public_root, approved.thumb_path)

    dry_run = run_photo_public_media_cleanup(session, apply_changes=False)

    assert dry_run["candidate_records"] == 2
    assert dry_run["cleared_records"] == 0
    assert all(path.is_file() for path in candidate_paths)
    assert rejected.public_path is not None
    assert pending.public_path is not None

    applied = run_photo_public_media_cleanup(session, apply_changes=True)
    session.refresh(rejected)
    session.refresh(pending)
    session.refresh(approved)

    assert applied["candidate_records"] == 2
    assert applied["cleared_records"] == 2
    assert applied["errors"] == 0
    assert not any(path.exists() for path in candidate_paths)
    assert rejected.public_path is None
    assert rejected.thumb_path is None
    assert rejected.audio_public_path is None
    assert pending.public_path is None
    assert pending.thumb_path is None
    assert approved.public_path is not None
    assert approved.thumb_path is not None
    assert approved_path.is_file()
    assert approved_thumb_path.is_file()

    second_run = run_photo_public_media_cleanup(session, apply_changes=True)
    assert second_run["candidate_records"] == 0
    assert second_run["cleared_records"] == 0
