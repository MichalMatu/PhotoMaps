from collections.abc import Generator
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image
from pytest import MonkeyPatch
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.db.session import get_session
from app.main import app
from app.models.photo import Photo
from app.models.place import Place
from app.services.media import images

ADMIN_TOKEN = "test-admin-token"
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}


def client_with_session(
    monkeypatch: MonkeyPatch,
    tmp_path: Path,
) -> Generator[tuple[TestClient, Session], None, None]:
    monkeypatch.setenv("ADMIN_TOKEN", ADMIN_TOKEN)
    private_dir = tmp_path / "private"
    public_dir = tmp_path / "public"
    monkeypatch.setattr(images, "PRIVATE_STORAGE_DIR", private_dir)
    monkeypatch.setattr(images, "PUBLIC_STORAGE_DIR", public_dir)

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        def override_session() -> Generator[Session, None, None]:
            yield session

        app.dependency_overrides[get_session] = override_session
        yield TestClient(app), session
        app.dependency_overrides.clear()


def image_upload() -> tuple[str, BytesIO, str]:
    buffer = BytesIO()
    image = Image.new("RGB", (16, 16), (18, 106, 90))
    image.save(buffer, format="JPEG", exif=b"example-exif")
    buffer.seek(0)
    return "place.jpg", buffer, "image/jpeg"


def test_photo_upload_stays_pending_and_hidden_publicly(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        response = client.post(
            f"/api/places/{place.id}/photos",
            files={"file": image_upload()},
            data={"caption": "Front", "consent_confirmed": "true"},
        )
        public_response = client.get(f"/api/places/{place.id}/photos")

        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "pending"
        assert body["caption"] == "Front"
        assert "original_path" not in body
        assert body["public_path"].startswith("/media/photos/")
        assert public_response.status_code == 200
        assert public_response.json() == []


def test_photo_upload_cleans_files_when_database_save_fails(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        def fail_commit() -> None:
            raise SQLAlchemyError("commit failed")

        monkeypatch.setattr(session, "commit", fail_commit)

        response = client.post(
            f"/api/places/{place.id}/photos",
            files={"file": image_upload()},
            data={"caption": "Front", "consent_confirmed": "true"},
        )
        stored_files = [path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()]

        assert response.status_code == 500
        assert response.json()["detail"] == "Photo could not be saved"
        assert stored_files == []
        assert session.exec(select(Photo)).all() == []


def test_photo_review_approves_and_updates_place_count(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        upload_response = client.post(
            f"/api/places/{place.id}/photos",
            files={"file": image_upload()},
            data={"consent_confirmed": "true"},
        )
        photo_id = upload_response.json()["id"]
        review_response = client.post(
            f"/api/admin/photos/{photo_id}/review",
            headers=ADMIN_HEADERS,
            json={"status": "approved"},
        )
        public_response = client.get(f"/api/places/{place.id}/photos")
        session.refresh(place)

        assert review_response.status_code == 200
        assert review_response.json()["status"] == "approved"
        assert public_response.status_code == 200
        assert public_response.json()[0]["id"] == photo_id
        assert place.photo_count == 1
        assert place.cover_photo_id == photo_id


def test_rejecting_approved_photo_decrements_place_count(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)
        photo = Photo(
            place_id=place.id,
            original_path="photos/original.jpg",
            public_path="/media/photos/public.jpg",
            thumb_path="/media/photos/thumb.jpg",
            status="approved",
        )
        place.photo_count = 1
        place.cover_photo_id = photo.id
        session.add(photo)
        session.add(place)
        session.commit()
        session.refresh(photo)

        response = client.post(
            f"/api/admin/photos/{photo.id}/review",
            headers=ADMIN_HEADERS,
            json={"status": "rejected"},
        )
        session.refresh(place)

        assert response.status_code == 200
        assert response.json()["status"] == "rejected"
        assert place.photo_count == 0
        assert place.cover_photo_id is None


def test_rejecting_cover_photo_selects_replacement(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)
        cover_photo = Photo(
            place_id=place.id,
            original_path="photos/cover-original.jpg",
            public_path="/media/photos/cover.jpg",
            thumb_path="/media/photos/cover-thumb.jpg",
            status="approved",
            approved_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
        )
        replacement_photo = Photo(
            place_id=place.id,
            original_path="photos/replacement-original.jpg",
            public_path="/media/photos/replacement.jpg",
            thumb_path="/media/photos/replacement-thumb.jpg",
            status="approved",
            approved_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        session.add(cover_photo)
        session.add(replacement_photo)
        session.commit()
        session.refresh(cover_photo)
        session.refresh(replacement_photo)
        place.photo_count = 2
        place.cover_photo_id = cover_photo.id
        session.add(place)
        session.commit()

        response = client.post(
            f"/api/admin/photos/{cover_photo.id}/review",
            headers=ADMIN_HEADERS,
            json={"status": "rejected"},
        )
        session.refresh(place)

        assert response.status_code == 200
        assert place.photo_count == 1
        assert place.cover_photo_id == replacement_photo.id


def test_photo_upload_requires_publication_consent(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        response = client.post(
            f"/api/places/{place.id}/photos",
            files={"file": image_upload()},
            data={"caption": "Front", "consent_confirmed": "false"},
        )

        assert response.status_code == 422


def test_admin_photo_list_can_return_all_or_filtered_statuses(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        for status in ("pending", "approved", "rejected"):
            session.add(
                Photo(
                    place_id=place.id,
                    original_path=f"photos/{status}-original.jpg",
                    public_path=f"/media/photos/{status}.jpg",
                    thumb_path=f"/media/photos/{status}-thumb.jpg",
                    status=status,
                )
            )
        session.commit()

        all_response = client.get("/api/admin/photos", headers=ADMIN_HEADERS)
        pending_response = client.get("/api/admin/photos?status=pending", headers=ADMIN_HEADERS)

        assert all_response.status_code == 200
        assert {photo["status"] for photo in all_response.json()} == {"pending", "approved", "rejected"}
        assert pending_response.status_code == 200
        assert [photo["status"] for photo in pending_response.json()] == ["pending"]


def test_admin_can_update_photo_caption(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)
        photo = Photo(
            place_id=place.id,
            original_path="photos/original.jpg",
            public_path="/media/photos/public.jpg",
            thumb_path="/media/photos/thumb.jpg",
            status="approved",
            caption="Stary podpis",
        )
        session.add(photo)
        session.commit()
        session.refresh(photo)

        response = client.patch(
            f"/api/admin/photos/{photo.id}",
            headers=ADMIN_HEADERS,
            json={"caption": "  Nowy podpis  "},
        )
        session.refresh(photo)

        assert response.status_code == 200
        assert response.json()["caption"] == "Nowy podpis"
        assert photo.caption == "Nowy podpis"


def test_admin_photo_caption_has_length_limit(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        photo = Photo(
            place_id=place.id,
            original_path="photos/original.jpg",
            public_path="/media/photos/public.jpg",
            thumb_path="/media/photos/thumb.jpg",
            status="approved",
            caption="Stary podpis",
        )
        session.add(place)
        session.add(photo)
        session.commit()
        session.refresh(photo)

        response = client.patch(
            f"/api/admin/photos/{photo.id}",
            headers=ADMIN_HEADERS,
            json={"caption": "x" * 121},
        )

        assert response.status_code == 422


def test_admin_can_set_approved_photo_as_cover(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)
        pending_photo = Photo(
            place_id=place.id,
            original_path="photos/pending-original.jpg",
            public_path="/media/photos/pending.jpg",
            thumb_path="/media/photos/pending-thumb.jpg",
            status="pending",
        )
        approved_photo = Photo(
            place_id=place.id,
            original_path="photos/approved-original.jpg",
            public_path="/media/photos/approved.jpg",
            thumb_path="/media/photos/approved-thumb.jpg",
            status="approved",
            approved_at=datetime.now(timezone.utc),
        )
        session.add(pending_photo)
        session.add(approved_photo)
        session.commit()
        session.refresh(pending_photo)
        session.refresh(approved_photo)

        pending_response = client.post(f"/api/admin/photos/{pending_photo.id}/cover", headers=ADMIN_HEADERS)
        approved_response = client.post(f"/api/admin/photos/{approved_photo.id}/cover", headers=ADMIN_HEADERS)
        session.refresh(place)

        assert pending_response.status_code == 422
        assert approved_response.status_code == 200
        assert approved_response.json()["cover_photo_id"] == approved_photo.id
        assert place.cover_photo_id == approved_photo.id


def test_public_photo_list_returns_cover_first(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)
        older_photo = Photo(
            place_id=place.id,
            original_path="photos/older-original.jpg",
            public_path="/media/photos/older.jpg",
            thumb_path="/media/photos/older-thumb.jpg",
            status="approved",
            approved_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        cover_photo = Photo(
            place_id=place.id,
            original_path="photos/cover-original.jpg",
            public_path="/media/photos/cover.jpg",
            thumb_path="/media/photos/cover-thumb.jpg",
            status="approved",
            approved_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        )
        session.add(older_photo)
        session.add(cover_photo)
        session.commit()
        session.refresh(cover_photo)
        place.cover_photo_id = cover_photo.id
        session.add(place)
        session.commit()

        response = client.get(f"/api/places/{place.id}/photos")

        assert response.status_code == 200
        assert response.json()[0]["id"] == cover_photo.id


def test_admin_delete_photo_removes_record_files_and_updates_place(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        first_original = Path("photos") / place.id / "first-original.jpg"
        first_public = Path("photos") / place.id / "first.jpg"
        first_thumb = Path("photos") / place.id / "first-thumb.jpg"
        private_file = tmp_path / "private" / first_original
        public_file = tmp_path / "public" / first_public
        thumb_file = tmp_path / "public" / first_thumb
        private_file.parent.mkdir(parents=True, exist_ok=True)
        public_file.parent.mkdir(parents=True, exist_ok=True)
        private_file.write_bytes(b"private")
        public_file.write_bytes(b"public")
        thumb_file.write_bytes(b"thumb")

        first_photo = Photo(
            place_id=place.id,
            original_path=first_original.as_posix(),
            public_path=f"/media/{first_public.as_posix()}",
            thumb_path=f"/media/{first_thumb.as_posix()}",
            status="approved",
            approved_at=datetime.now(timezone.utc),
        )
        second_photo = Photo(
            place_id=place.id,
            original_path="photos/second-original.jpg",
            public_path="/media/photos/second.jpg",
            thumb_path="/media/photos/second-thumb.jpg",
            status="approved",
            approved_at=datetime.now(timezone.utc),
        )
        session.add(first_photo)
        session.add(second_photo)
        session.commit()
        session.refresh(first_photo)
        session.refresh(second_photo)
        place.photo_count = 2
        place.cover_photo_id = first_photo.id
        session.add(place)
        session.commit()

        response = client.delete(f"/api/admin/photos/{first_photo.id}", headers=ADMIN_HEADERS)
        session.refresh(place)

        assert response.status_code == 204
        assert session.get(Photo, first_photo.id) is None
        assert place.photo_count == 1
        assert place.cover_photo_id == second_photo.id
        assert not private_file.exists()
        assert not public_file.exists()
        assert not thumb_file.exists()
