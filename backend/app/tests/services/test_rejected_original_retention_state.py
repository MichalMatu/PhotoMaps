from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.models.memory import Memory
from app.models.photo import Photo
from app.services.admin_photos import review_admin_photo
from app.services.local_data_diagnostics import run_local_data_diagnostics
from app.services.private_original_retention import run_private_original_retention
from app.services.review import review_memory
from app.services.tokens import claim_token_hash
from app.tests.support import create_place


def write_file(root: Path, relative_path: str, content: bytes = b"image") -> Path:
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)
    return path


def test_rejected_retention_clears_database_paths_and_deletes_files(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    photo_path = f"photos/{place.id}/rejected-original.jpg"
    memory_path = f"memories/{place.id}/rejected-original.jpg"
    photo_file = write_file(tmp_path / "private", photo_path)
    memory_file = write_file(tmp_path / "private", memory_path)
    photo = Photo(
        place_id=place.id,
        original_path=photo_path,
        status="rejected",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    memory = Memory(
        place_id=place.id,
        caption="Rejected",
        memory_text="Rejected",
        original_path=memory_path,
        status="rejected",
        claim_token_hash=claim_token_hash("retention-test"),
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    session.add(photo)
    session.add(memory)
    session.commit()

    report = run_private_original_retention(
        session,
        apply_changes=True,
        rejected_retention_days=0,
        now=datetime(2026, 3, 1, tzinfo=UTC),
    )
    session.refresh(photo)
    session.refresh(memory)

    assert report["status"] == "ok"
    assert report["summary"]["actions"]["rejected_removed"] == 2
    assert photo.original_path is None
    assert memory.original_path is None
    assert not photo_file.exists()
    assert not memory_file.exists()


def test_rejected_retention_keeps_file_when_database_commit_fails(client_session, tmp_path: Path, monkeypatch) -> None:
    _client, session = client_session
    place = create_place(session)
    original_path = f"photos/{place.id}/rejected-original.jpg"
    original_file = write_file(tmp_path / "private", original_path)
    photo = Photo(
        place_id=place.id,
        original_path=original_path,
        status="rejected",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    session.add(photo)
    session.commit()

    def fail_commit() -> None:
        raise RuntimeError("simulated commit failure")

    monkeypatch.setattr(session, "commit", fail_commit)
    with pytest.raises(RuntimeError, match="simulated commit failure"):
        run_private_original_retention(
            session,
            apply_changes=True,
            rejected_retention_days=0,
            now=datetime(2026, 3, 1, tzinfo=UTC),
        )

    assert original_file.exists()


def test_purged_rejected_media_cannot_be_reapproved(client_session) -> None:
    _client, session = client_session
    place = create_place(session)
    photo = Photo(place_id=place.id, original_path=None, status="rejected")
    memory = Memory(
        place_id=place.id,
        caption="Rejected",
        memory_text="Rejected",
        original_path=None,
        status="rejected",
        claim_token_hash=claim_token_hash("reapprove-test"),
    )
    session.add(photo)
    session.add(memory)
    session.commit()
    session.refresh(photo)
    session.refresh(memory)

    with pytest.raises(HTTPException) as photo_exc:
        review_admin_photo(session, photo.id, "approved")
    assert photo_exc.value.status_code == 422
    assert photo_exc.value.detail == "Photo original is no longer retained"

    with pytest.raises(HTTPException) as memory_exc:
        review_memory(memory, place, "approved")
    assert memory_exc.value.status_code == 422
    assert memory_exc.value.detail == "Memory original is no longer retained"


def test_diagnostics_accepts_null_original_only_for_rejected_media(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    rejected = Photo(place_id=place.id, original_path=None, status="rejected")
    pending = Memory(
        place_id=place.id,
        caption="Pending",
        memory_text="Pending",
        original_path=None,
        status="pending",
        claim_token_hash=claim_token_hash("diagnostics-test"),
    )
    session.add(rejected)
    session.add(pending)
    session.commit()

    report = run_local_data_diagnostics(
        session,
        private_storage_dir=tmp_path / "private",
        public_storage_dir=tmp_path / "public",
        check_images=False,
    )
    issue_codes = {item["code"] for item in report["issues"]}

    assert "photo_original_path_missing" not in issue_codes
    assert "memory_original_path_missing" in issue_codes
