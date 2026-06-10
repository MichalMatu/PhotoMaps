from collections.abc import Generator
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image
from pytest import MonkeyPatch
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.init_db import seed_categories
from app.db.session import get_session
from app.main import app
from app.models.photo import Photo
from app.models.place import Place
from app.services.media import images


def client_with_session(
    monkeypatch: MonkeyPatch,
    tmp_path: Path,
) -> Generator[tuple[TestClient, Session], None, None]:
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
        seed_categories(session)

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
            data={"caption": "Front"},
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


def test_photo_review_approves_and_updates_place_count(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        upload_response = client.post(
            f"/api/places/{place.id}/photos",
            files={"file": image_upload()},
        )
        photo_id = upload_response.json()["id"]
        review_response = client.post(f"/api/admin/photos/{photo_id}/review", json={"status": "approved"})
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

        response = client.post(f"/api/admin/photos/{photo.id}/review", json={"status": "rejected"})
        session.refresh(place)

        assert response.status_code == 200
        assert response.json()["status"] == "rejected"
        assert place.photo_count == 0
        assert place.cover_photo_id is None
