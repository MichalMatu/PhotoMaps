from datetime import UTC, datetime
from pathlib import Path

from PIL import Image

from app.models.photo import Photo
from app.services.photo_media import public_photo_image_url_for
from app.services.photo_original_migration import run_photo_original_serving_migration
from app.tests.support import create_place


def write_jpeg(path: Path, *, size: tuple[int, int] = (32, 24)) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, (90, 40, 20)).save(path, "JPEG")
    return path


def legacy_photo(session, tmp_path: Path) -> tuple[Photo, Path, Path, Path]:
    place = create_place(session)
    original_path = f"photos/{place.id}/photo-original.jpg"
    public_path = f"photos/{place.id}/photo.jpg"
    thumb_path = f"photos/{place.id}/photo-thumb.jpg"
    original = write_jpeg(tmp_path / "private" / original_path)
    public = write_jpeg(tmp_path / "public" / public_path, size=(80, 60))
    thumb = write_jpeg(tmp_path / "public" / thumb_path)
    photo = Photo(
        place_id=place.id,
        original_path=original_path,
        public_path=f"/media/{public_path}",
        thumb_path=f"/media/{thumb_path}",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo, original, public, thumb


def test_photo_original_migration_dry_run_is_non_destructive(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    photo, original, public, thumb = legacy_photo(session, tmp_path)
    old_url = photo.public_path
    old_bytes = public.read_bytes()

    report = run_photo_original_serving_migration(session, apply_changes=False)
    session.refresh(photo)

    assert report["status"] == "ok"
    assert report["summary"]["candidates"] == 1
    assert report["summary"]["reclaimable_bytes"] == len(old_bytes)
    assert photo.public_path == old_url
    assert original.is_file()
    assert public.read_bytes() == old_bytes
    assert thumb.is_file()


def test_photo_original_migration_updates_db_before_removing_legacy_file(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    photo, original, public, thumb = legacy_photo(session, tmp_path)
    source_bytes = original.read_bytes()
    legacy_size = public.stat().st_size

    report = run_photo_original_serving_migration(session, apply_changes=True)
    session.refresh(photo)

    assert report["status"] == "ok"
    assert report["summary"]["db_applied"] is True
    assert report["summary"]["deleted_bytes"] == legacy_size
    assert photo.public_path == public_photo_image_url_for(photo)
    assert original.read_bytes() == source_bytes
    assert thumb.is_file()
    assert not public.exists()

    repeated = run_photo_original_serving_migration(session, apply_changes=False)
    assert repeated["summary"]["candidates"] == 0
    assert repeated["summary"]["already_migrated"] == 1


def test_photo_original_migration_refuses_missing_source_or_thumb(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    photo, original, public, thumb = legacy_photo(session, tmp_path)
    original.unlink()

    report = run_photo_original_serving_migration(session, apply_changes=True)
    session.refresh(photo)

    assert report["status"] == "error"
    assert report["summary"]["db_applied"] is False
    assert photo.public_path.startswith("/media/")
    assert public.is_file()
    assert thumb.is_file()
