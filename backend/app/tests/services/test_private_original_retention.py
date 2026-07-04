from datetime import UTC, datetime
from pathlib import Path

from app.models.memory import Memory
from app.models.photo import Photo
from app.services.local_data_diagnostics import run_local_data_diagnostics
from app.services.private_original_retention import run_private_original_retention
from app.services.tokens import claim_token_hash
from app.tests.support import create_place


def write_file(root: Path, relative_path: str, content: bytes = b"image") -> Path:
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def test_private_original_retention_dry_run_does_not_change_files_or_models(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    original_path = f"photos/{place.id}/photo-original.jpg"
    public_path = f"photos/{place.id}/photo.jpg"
    thumb_path = f"photos/{place.id}/photo-thumb.jpg"
    original_file = write_file(private_root, original_path, b"original")
    write_file(public_root, public_path, b"public")
    write_file(public_root, thumb_path, b"thumb")
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

    report = run_private_original_retention(
        session,
        apply_changes=False,
        approved_retention_days=30,
        now=datetime(2026, 3, 1, tzinfo=UTC),
    )

    assert report["status"] == "ok"
    assert report["summary"]["actions"]["approved_replaced"] == 1
    assert report["actions"][0]["applied"] is False
    assert original_file.read_bytes() == b"original"
    assert photo.original_path == original_path


def test_private_original_retention_apply_replaces_approved_and_removes_rejected(
    client_session,
    tmp_path: Path,
) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"

    approved_original = f"memories/{place.id}/approved-original.jpg"
    approved_public = f"memories/{place.id}/approved.jpg"
    approved_thumb = f"memories/{place.id}/approved-thumb.jpg"
    rejected_original = f"photos/{place.id}/rejected-original.jpg"
    rejected_public = f"photos/{place.id}/rejected.jpg"
    rejected_thumb = f"photos/{place.id}/rejected-thumb.jpg"
    approved_original_file = write_file(private_root, approved_original, b"private-original")
    rejected_original_file = write_file(private_root, rejected_original, b"rejected-original")
    write_file(public_root, approved_public, b"public-derivative")
    write_file(public_root, approved_thumb, b"approved-thumb")
    write_file(public_root, rejected_public, b"rejected-public")
    write_file(public_root, rejected_thumb, b"rejected-thumb")

    memory = Memory(
        place_id=place.id,
        caption="Pamiątka",
        memory_text="Krótka myśl",
        original_path=approved_original,
        public_path=f"/media/{approved_public}",
        thumb_path=f"/media/{approved_thumb}",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
        claim_token_hash=claim_token_hash("secret-token"),
    )
    photo = Photo(
        place_id=place.id,
        original_path=rejected_original,
        public_path=f"/media/{rejected_public}",
        thumb_path=f"/media/{rejected_thumb}",
        status="rejected",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    session.add(memory)
    session.add(photo)
    session.commit()
    session.refresh(memory)
    session.refresh(photo)

    report = run_private_original_retention(
        session,
        apply_changes=True,
        approved_retention_days=30,
        rejected_retention_days=0,
        now=datetime(2026, 3, 1, tzinfo=UTC),
    )
    session.refresh(memory)
    session.refresh(photo)
    retained_file = private_root / memory.original_path

    assert report["status"] == "ok"
    assert report["summary"]["actions"]["approved_replaced"] == 1
    assert report["summary"]["actions"]["rejected_removed"] == 1
    assert not approved_original_file.exists()
    assert retained_file.read_bytes() == b"public-derivative"
    assert memory.original_path.endswith("-retained.jpg")
    assert not rejected_original_file.exists()
    assert photo.original_path == rejected_original


def test_local_data_diagnostics_allows_retained_rejected_private_original(
    client_session,
    tmp_path: Path,
) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    public_path = f"photos/{place.id}/rejected.jpg"
    thumb_path = f"photos/{place.id}/rejected-thumb.jpg"
    write_file(public_root, public_path, b"public")
    write_file(public_root, thumb_path, b"thumb")
    photo = Photo(
        place_id=place.id,
        original_path=f"photos/{place.id}/deleted-original.jpg",
        public_path=f"/media/{public_path}",
        thumb_path=f"/media/{thumb_path}",
        status="rejected",
    )
    session.add(photo)
    session.commit()

    report = run_local_data_diagnostics(
        session,
        private_storage_dir=private_root,
        public_storage_dir=public_root,
        check_images=False,
    )
    issue_codes = {issue["code"] for issue in report["issues"]}

    assert "photo_original_missing" not in issue_codes
