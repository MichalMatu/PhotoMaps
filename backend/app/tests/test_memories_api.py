from collections.abc import Generator
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image
from pytest import MonkeyPatch
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.api.routes.memories import MAX_MEMORY_AUTHOR_LENGTH, MAX_MEMORY_CAPTION_LENGTH, MAX_MEMORY_TEXT_LENGTH
from app.db.session import get_session
from app.main import app
from app.models.memory import Memory
from app.models.place import Place
from app.services.media import images
from app.services.tokens import MAX_CLAIM_TOKEN_LENGTH, claim_token_hash

ADMIN_TOKEN = "test-admin-token"
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
MEMORY_TOKEN = "secret-token"
MEMORY_TEXT = "Krótka myśl z tego miejsca"


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
                "memory_text": MEMORY_TEXT,
                "author_name": "Marta",
                "author_city": "Wrocław",
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "true",
            },
        )
        public_response = client.get(f"/api/places/{place.id}/memories")

        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "pending"
        assert body["caption"] == "Byłem tutaj"
        assert body["memory_text"] == MEMORY_TEXT
        assert body["author_name"] == "Marta"
        assert "claim_token_hash" not in body
        assert "original_path" not in body
        assert public_response.status_code == 200
        assert public_response.json() == []


def test_memory_upload_cleans_files_when_database_save_fails(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        def fail_commit() -> None:
            raise SQLAlchemyError("commit failed")

        monkeypatch.setattr(session, "commit", fail_commit)

        response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Byłem tutaj",
                "memory_text": MEMORY_TEXT,
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "true",
            },
        )
        stored_files = [path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()]

        assert response.status_code == 500
        assert response.json()["detail"] == "Memory could not be saved"
        assert stored_files == []
        assert session.exec(select(Memory)).all() == []


def test_memory_review_approves_and_updates_place_count(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)
        upload_response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Dobra historia",
                "memory_text": MEMORY_TEXT,
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "true",
            },
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
        assert public_response.json()[0]["memory_text"] == MEMORY_TEXT
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
            data={
                "caption": "Dobra historia",
                "memory_text": MEMORY_TEXT,
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "false",
            },
        )

        assert response.status_code == 422


def test_memory_upload_requires_claim_token(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        short_response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Dobra historia",
                "memory_text": MEMORY_TEXT,
                "claim_token": "short",
                "consent_confirmed": "true",
            },
        )
        long_response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Dobra historia",
                "memory_text": MEMORY_TEXT,
                "claim_token": "x" * (MAX_CLAIM_TOKEN_LENGTH + 1),
                "consent_confirmed": "true",
            },
        )

        assert short_response.status_code == 422
        assert long_response.status_code == 422


def test_memory_upload_limits_text_field_lengths(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        caption_response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "x" * (MAX_MEMORY_CAPTION_LENGTH + 1),
                "memory_text": MEMORY_TEXT,
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "true",
            },
        )
        memory_text_response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Dobra historia",
                "memory_text": "x" * (MAX_MEMORY_TEXT_LENGTH + 1),
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "true",
            },
        )
        author_response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Dobra historia",
                "memory_text": MEMORY_TEXT,
                "author_name": "x" * (MAX_MEMORY_AUTHOR_LENGTH + 1),
                "author_city": "x" * (MAX_MEMORY_AUTHOR_LENGTH + 1),
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "true",
            },
        )

        assert caption_response.status_code == 422
        assert memory_text_response.status_code == 422
        assert author_response.status_code == 422


def test_memory_claim_update_and_delete_use_same_token(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)
        upload_response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Pierwszy opis",
                "memory_text": MEMORY_TEXT,
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "true",
            },
        )
        memory_id = upload_response.json()["id"]
        memory = session.get(Memory, memory_id)
        assert memory is not None
        private_file = tmp_path / "private" / memory.original_path
        public_file = tmp_path / "public" / memory.public_path.removeprefix("/media/")
        thumb_file = tmp_path / "public" / memory.thumb_path.removeprefix("/media/")
        review_response = client.post(
            f"/api/admin/memories/{memory_id}/review",
            headers=ADMIN_HEADERS,
            json={"status": "approved"},
        )

        rejected_claim = client.post(
            f"/api/places/{place.id}/memories/{memory_id}/claim",
            json={"claim_token": "wrong-token"},
        )
        accepted_claim = client.post(
            f"/api/places/{place.id}/memories/{memory_id}/claim",
            json={"claim_token": MEMORY_TOKEN},
        )
        update_response = client.patch(
            f"/api/places/{place.id}/memories/{memory_id}",
            json={
                "author_city": "Wrocław",
                "author_name": "Marta",
                "caption": "Poprawiony opis",
                "memory_text": "Poprawiona myśl",
                "claim_token": MEMORY_TOKEN,
            },
        )
        delete_response = client.request(
            "DELETE",
            f"/api/places/{place.id}/memories/{memory_id}",
            json={"claim_token": MEMORY_TOKEN},
        )
        public_response = client.get(f"/api/places/{place.id}/memories")
        session.refresh(place)

        assert review_response.status_code == 200
        assert rejected_claim.status_code == 403
        assert accepted_claim.status_code == 200
        assert accepted_claim.json() == {"can_edit": True}
        assert update_response.status_code == 200
        assert update_response.json()["caption"] == "Poprawiony opis"
        assert update_response.json()["memory_text"] == "Poprawiona myśl"
        assert update_response.json()["author_name"] == "Marta"
        assert delete_response.status_code == 204
        assert public_response.json() == []
        assert session.get(Memory, memory_id) is None
        assert place.memory_count == 0
        assert session.get(type(place), place.id).memory_count == 0
        assert not private_file.exists()
        assert not public_file.exists()
        assert not thumb_file.exists()


def test_memory_hash_is_not_plaintext(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        response = client.post(
            f"/api/places/{place.id}/memories",
            files={"file": image_upload()},
            data={
                "caption": "Dobra historia",
                "memory_text": MEMORY_TEXT,
                "claim_token": MEMORY_TOKEN,
                "consent_confirmed": "true",
            },
        )
        memory_id = response.json()["id"]
        memory = session.get(Memory, memory_id)

        assert memory is not None
        assert memory.claim_token_hash == claim_token_hash(MEMORY_TOKEN)
        assert memory.claim_token_hash != MEMORY_TOKEN


def test_admin_can_update_memory_text_fields(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        memory = Memory(
            place_id=place.id,
            author_name="Marta",
            author_city="Wrocław",
            caption="Pamiątka",
            memory_text=MEMORY_TEXT,
            original_path="memories/original.jpg",
            public_path="/media/memories/public.jpg",
            thumb_path="/media/memories/thumb.jpg",
            status="approved",
            claim_token_hash=claim_token_hash(MEMORY_TOKEN),
        )
        session.add(place)
        session.add(memory)
        session.commit()
        session.refresh(memory)

        response = client.patch(
            f"/api/admin/memories/{memory.id}",
            headers=ADMIN_HEADERS,
            json={
                "author_city": "  Opole  ",
                "author_name": "  Michał  ",
                "caption": "  Nowy podpis  ",
                "memory_text": "  Nowa myśl  ",
            },
        )
        session.refresh(memory)

        assert response.status_code == 200
        assert response.json()["author_city"] == "Opole"
        assert response.json()["author_name"] == "Michał"
        assert response.json()["caption"] == "Nowy podpis"
        assert response.json()["memory_text"] == "Nowa myśl"
        assert memory.caption == "Nowy podpis"


def test_admin_delete_memory_removes_record_files_and_updates_place(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    for client, session in client_with_session(monkeypatch, tmp_path):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        original_path = Path("memories") / place.id / "memory-original.jpg"
        public_path = Path("memories") / place.id / "memory.jpg"
        thumb_path = Path("memories") / place.id / "memory-thumb.jpg"
        private_file = tmp_path / "private" / original_path
        public_file = tmp_path / "public" / public_path
        thumb_file = tmp_path / "public" / thumb_path
        private_file.parent.mkdir(parents=True, exist_ok=True)
        public_file.parent.mkdir(parents=True, exist_ok=True)
        private_file.write_bytes(b"private")
        public_file.write_bytes(b"public")
        thumb_file.write_bytes(b"thumb")

        memory = Memory(
            place_id=place.id,
            author_name="Marta",
            caption="Pamiątka",
            memory_text=MEMORY_TEXT,
            original_path=original_path.as_posix(),
            public_path=f"/media/{public_path.as_posix()}",
            thumb_path=f"/media/{thumb_path.as_posix()}",
            status="approved",
            claim_token_hash=claim_token_hash(MEMORY_TOKEN),
        )
        session.add(memory)
        session.commit()
        session.refresh(memory)
        place.memory_count = 1
        session.add(place)
        session.commit()

        response = client.delete(f"/api/admin/memories/{memory.id}", headers=ADMIN_HEADERS)
        session.refresh(place)

        assert response.status_code == 204
        assert session.get(Memory, memory.id) is None
        assert place.memory_count == 0
        assert not private_file.exists()
        assert not public_file.exists()
        assert not thumb_file.exists()
