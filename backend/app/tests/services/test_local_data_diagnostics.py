from datetime import UTC, datetime
from pathlib import Path

from PIL import Image

from app.models.memory import Memory
from app.models.photo import Photo
from app.services.local_data_diagnostics import run_local_data_diagnostics
from app.tests.support import create_place


def write_image(root: Path, relative_path: str) -> None:
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (12, 12), (24, 96, 128)).save(path, "JPEG")


def test_local_data_diagnostics_pass_for_consistent_media(client_session, tmp_path: Path) -> None:
    _, session = client_session
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    place = create_place(session)
    photo_original = f"photos/{place.id}/photo-original.jpg"
    photo_public = f"photos/{place.id}/photo.jpg"
    photo_thumb = f"photos/{place.id}/photo-thumb.jpg"
    memory_original = f"memories/{place.id}/memory-original.jpg"
    memory_public = f"memories/{place.id}/memory.jpg"
    memory_thumb = f"memories/{place.id}/memory-thumb.jpg"

    for relative_path in (photo_original, memory_original):
        write_image(private_root, relative_path)
    for relative_path in (photo_public, photo_thumb, memory_public, memory_thumb):
        write_image(public_root, relative_path)

    photo = Photo(
        place_id=place.id,
        original_path=photo_original,
        public_path=f"/media/{photo_public}",
        thumb_path=f"/media/{photo_thumb}",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    memory = Memory(
        place_id=place.id,
        caption="Pocztówka",
        memory_text="Krótka pamiątka z miejsca.",
        original_path=memory_original,
        public_path=f"/media/{memory_public}",
        thumb_path=f"/media/{memory_thumb}",
        status="approved",
        claim_token_hash="hash",
        approved_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    session.add(photo)
    session.add(memory)
    session.commit()
    session.refresh(photo)
    place.photo_count = 1
    place.memory_count = 1
    place.cover_photo_id = photo.id
    session.add(place)
    session.commit()

    report = run_local_data_diagnostics(
        session,
        private_storage_dir=private_root,
        public_storage_dir=public_root,
    )

    assert report["status"] == "ok"
    assert report["summary"]["photos"]["records"] == 1
    assert report["summary"]["memories"]["records"] == 1
    assert report["summary"]["storage"]["orphan_private_files"] == 0
    assert report["summary"]["storage"]["orphan_public_files"] == 0
    assert report["issues"] == []


def test_local_data_diagnostics_reports_bad_status_and_missing_media(client_session, tmp_path: Path) -> None:
    _, session = client_session
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    place = create_place(session)
    photo = Photo(
        place_id=place.id,
        original_path="photos/missing-original.jpg",
        public_path="/media/photos/missing.jpg",
        thumb_path="/media/photos/missing-thumb.jpg",
        status="unexpected",
    )
    session.add(photo)
    session.commit()

    report = run_local_data_diagnostics(
        session,
        private_storage_dir=private_root,
        public_storage_dir=public_root,
        check_images=False,
    )
    codes = {issue["code"] for issue in report["issues"]}

    assert report["status"] == "error"
    assert "photo_bad_status" in codes
    assert "photo_original_missing" in codes
    assert "photo_public_path_missing" in codes
    assert "photo_thumb_path_missing" in codes


def test_local_data_diagnostics_warns_about_orphan_storage(client_session, tmp_path: Path) -> None:
    _, session = client_session
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    create_place(session)
    write_image(private_root, "photos/orphan-original.jpg")
    write_image(public_root, "photos/orphan.jpg")

    report = run_local_data_diagnostics(
        session,
        private_storage_dir=private_root,
        public_storage_dir=public_root,
    )
    codes = {issue["code"] for issue in report["issues"]}

    assert report["status"] == "warning"
    assert "orphan_private_file" in codes
    assert "orphan_public_file" in codes
