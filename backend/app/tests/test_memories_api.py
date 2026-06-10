from collections.abc import Generator
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image
from pytest import MonkeyPatch
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.session import get_session
from app.main import app
from app.models.place import Place
from app.services.media import images

ADMIN_TOKEN = "test-admin-token"
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}


def client_with_session(
    monkeypatch: MonkeyPatch,
    tmp_path: Path,
) -> Generator[tuple[TestClient, Session], None, None]:
    monkeypatch.setenv("ADMIN_TOKEN", ADMIN_TOKEN)
    monkeypatch.setattr(images, "PRIVATE_STORAGE_DIR", tmp_path / "private")
    monkeypatch.setattr(images, "PUBLIC_STORAGE_DIR", tmp_path / "public")

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
    return "memory.jpg", buffer, "image/jpeg"


def test_memory_upload_stays_pending_and_hidden_publicly(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Byłem tutaj",
                "author_name": "Marta",
                "author_city": "Wrocław",
                "consent_confirmed": "true",
            },
        )
        public_response = client.get(f"/api/places/{place.id}/memories")

        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "pending"
        assert body["caption"] == "Byłem tutaj"
        assert body["author_name"] == "Marta"
        assert "original_path" not in body
        assert public_response.status_code == 200
        assert public_response.json() == []


def test_memory_review_approves_and_updates_place_count(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)
        upload_response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={"caption": "Dobra historia", "consent_confirmed": "true"},
        )
        memory_id = upload_response.json()["id"]

        review_response = client.post(
            f"/api/admin/memories/{memory_id}/review",
            headers=ADMIN_HEADERS,
            json={"status": "approved"},
        )
        public_response = client.get(f"/api/places/{place.id}/memories")
        session.refresh(place)

        assert review_response.status_code == 200
        assert review_response.json()["status"] == "approved"
        assert public_response.status_code == 200
        assert public_response.json()[0]["id"] == memory_id
        assert place.memory_count == 1


def test_memory_upload_requires_publication_consent(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={"caption": "Dobra historia", "consent_confirmed": "false"},
        )

        assert response.status_code == 422
