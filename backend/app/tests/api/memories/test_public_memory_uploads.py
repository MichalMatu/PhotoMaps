import asyncio
from io import BytesIO
from pathlib import Path

import pytest
from fastapi import HTTPException
from PIL import Image
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

from app.core import public_submission_security
from app.core.rate_limit import RateLimitPolicy
from app.models.memory import Memory
from app.services import memory_uploads as memory_upload_service
from app.services.media import audio as audio_service
from app.services.media import pending_queue
from app.services.memory_fields import MAX_MEMORY_AUTHOR_LENGTH, MAX_MEMORY_CAPTION_LENGTH, MAX_MEMORY_TEXT_LENGTH
from app.services.tokens import MAX_CLAIM_TOKEN_LENGTH, claim_token_hash
from app.tests.support import ADMIN_HEADERS, audio_upload, create_place, image_upload

MEMORY_TOKEN = "secret-token"
MEMORY_TEXT = "Krótka myśl z tego miejsca"


def image_pixel(path: Path, xy: tuple[int, int]) -> tuple[int, int, int]:
    with Image.open(path) as image:
        return image.convert("RGB").getpixel(xy)


def assert_blurred_pixel(value: tuple[int, int, int]) -> None:
    assert 40 < value[0] < 220
    assert 40 < value[1] < 220
    assert 40 < value[2] < 220


class TrackingUpload:
    def __init__(self, content: bytes) -> None:
        self._content = content
        self.bytes_read = 0

    async def read(self, size: int) -> bytes:
        chunk = self._content[self.bytes_read : self.bytes_read + size]
        self.bytes_read += len(chunk)
        return chunk


def test_upload_reader_stops_one_byte_after_configured_limit() -> None:
    upload = TrackingUpload(b"x" * 100)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(memory_upload_service.read_upload_with_limit(upload, 5, "Image"))

    assert exc_info.value.status_code == 413
    assert exc_info.value.detail == "Image file is too large"
    assert upload.bytes_read == 6


def test_memory_upload_stays_pending_private_and_hidden_publicly(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
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
    memory = session.exec(select(Memory)).one()

    assert response.status_code == 201
    body = response.json()
    assert memory.status == "pending"
    assert memory.public_path is None
    assert memory.thumb_path is None
    assert body["caption"] == "Byłem tutaj"
    assert body["memory_text"] == MEMORY_TEXT
    assert body["author_name"] == "Marta"
    assert body["status"] == "pending"
    assert "public_path" not in body
    assert "thumb_path" not in body
    assert "audio" not in body
    assert "claim_token_hash" not in body
    assert "original_path" not in body
    assert public_response.status_code == 200
    assert public_response.json() == []
    assert [path for path in (tmp_path / "public").rglob("*") if path.is_file()] == []

    admin_response = client.get("/api/admin/memories", headers=ADMIN_HEADERS)
    admin_body = admin_response.json()[0]
    thumb_response = client.get(admin_body["admin_thumb_path"], headers=ADMIN_HEADERS)
    image_response = client.get(admin_body["admin_public_path"], headers=ADMIN_HEADERS)

    assert admin_body["public_path"] is None
    assert admin_body["thumb_path"] is None
    assert thumb_response.status_code == 200
    assert thumb_response.headers["content-type"] in {"image/jpeg", "image/png"}
    assert image_response.status_code == 200


def test_memory_upload_rejects_unsupported_image_format(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)
    buffer = BytesIO()
    Image.new("RGB", (16, 16), (18, 106, 90)).save(buffer, format="BMP")

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": ("memory.bmp", buffer.getvalue(), "image/bmp")},
        data={
            "caption": "Byłem tutaj",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Unsupported image file"
    assert session.exec(select(Memory)).all() == []
    assert [path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*")] == []


def test_memory_upload_enforces_streamed_image_byte_limit(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(memory_upload_service, "MAX_IMAGE_BYTES", 32)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Byłem tutaj",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Image file is too large"
    assert session.exec(select(Memory)).all() == []
    assert [path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*")] == []


def test_memory_upload_offloads_image_processing_from_event_loop(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    processed_functions = []

    async def run_inline(function, *args):
        processed_functions.append(function)
        return function(*args)

    monkeypatch.setattr(memory_upload_service, "run_in_threadpool", run_inline)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Byłem tutaj",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )

    assert response.status_code == 201
    assert memory_upload_service.store_private_image_bytes in processed_functions


def test_memory_upload_rate_limit_cannot_be_bypassed_with_client_header(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(
        public_submission_security,
        "PUBLIC_MEMORY_UPLOAD_RATE_LIMIT_POLICY",
        RateLimitPolicy(scope="test-memory-upload", requests=1, window_seconds=60),
    )

    first_response = client.post(
        f"/api/places/{place.id}/memories",
        headers={"CF-Connecting-IP": "203.0.113.1"},
        files={"file": image_upload("memory-1.jpg")},
        data={
            "caption": "Pierwsza",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    limited_response = client.post(
        f"/api/places/{place.id}/memories",
        headers={"CF-Connecting-IP": "203.0.113.2"},
        files={"file": image_upload("memory-2.jpg")},
        data={
            "caption": "Druga",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )

    assert first_response.status_code == 201
    assert limited_response.status_code == 429
    assert limited_response.json()["detail"] == "Too many requests"
    assert limited_response.headers["retry-after"] == "60"


def test_memory_upload_with_audio_is_hidden_until_approved(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(audio_service, "audio_duration_seconds", lambda _content: 1.25)
    monkeypatch.setattr(audio_service, "strip_public_audio_metadata", lambda _path: None)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg"), "audio_file": audio_upload("memory.mp3")},
        data={
            "caption": "Byłem tutaj",
            "memory_text": MEMORY_TEXT,
            "author_name": "Marta",
            "author_city": "Wrocław",
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    memory = session.exec(select(Memory)).one()
    admin_response = client.get("/api/admin/memories", headers=ADMIN_HEADERS)
    hidden_response = client.get(f"/api/places/{place.id}/memories")

    assert response.status_code == 201
    assert "audio" not in response.json()
    assert memory.audio_public_path is None
    assert memory.audio_original_path is not None
    assert admin_response.json()[0]["audio"] is None
    assert admin_response.json()[0]["admin_audio"] == {
        "duration_seconds": 1.25,
        "mime_type": "audio/mpeg",
        "public_path": f"/api/admin/memories/{memory.id}/media/audio",
        "size_bytes": len(b"test-audio"),
    }
    assert client.get(admin_response.json()[0]["admin_audio"]["public_path"], headers=ADMIN_HEADERS).status_code == 200
    assert hidden_response.json() == []

    review_response = client.post(
        f"/api/admin/memories/{memory.id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    public_response = client.get(f"/api/places/{place.id}/memories")

    assert review_response.status_code == 200
    session.refresh(memory)
    assert memory.audio_public_path is not None
    assert public_response.json()[0]["audio"] == {
        "duration_seconds": 1.25,
        "mime_type": "audio/mpeg",
        "public_path": memory.audio_public_path,
        "size_bytes": memory.audio_size_bytes,
    }
    assert "audio_original_path" not in public_response.json()[0]


def test_rejected_memory_unpublishes_public_media(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)

    upload_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Byłem tutaj",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    memory = session.exec(select(Memory)).one()
    approve_response = client.post(
        f"/api/admin/memories/{memory.id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    session.refresh(memory)
    public_path = memory.public_path
    thumb_path = memory.thumb_path

    reject_response = client.post(
        f"/api/admin/memories/{memory.id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "rejected"},
    )
    session.refresh(memory)

    assert upload_response.status_code == 201
    assert approve_response.status_code == 200
    assert public_path is not None
    assert thumb_path is not None
    assert reject_response.status_code == 200
    assert reject_response.json()["public_path"] is None
    assert reject_response.json()["thumb_path"] is None
    assert memory.public_path is None
    assert memory.thumb_path is None
    assert not (tmp_path / "public" / public_path.removeprefix("/media/")).exists()
    assert not (tmp_path / "public" / thumb_path.removeprefix("/media/")).exists()
    assert client.get(public_path).status_code == 404


def test_memory_upload_cleans_files_when_database_save_fails(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)

    def fail_commit() -> None:
        raise SQLAlchemyError("commit failed")

    monkeypatch.setattr(session, "commit", fail_commit)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Byłem tutaj",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    stored_files = [
        path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()
    ]

    assert response.status_code == 500
    assert response.json()["detail"] == "Memory could not be saved"
    assert stored_files == []
    assert session.exec(select(Memory)).all() == []


def test_memory_upload_with_audio_cleans_files_when_database_save_fails(
    client_session,
    tmp_path: Path,
    monkeypatch,
) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(audio_service, "audio_duration_seconds", lambda _content: 1.25)
    monkeypatch.setattr(audio_service, "strip_public_audio_metadata", lambda _path: None)

    def fail_commit() -> None:
        raise SQLAlchemyError("commit failed")

    monkeypatch.setattr(session, "commit", fail_commit)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg"), "audio_file": audio_upload("memory.mp3")},
        data={
            "caption": "Byłem tutaj",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    stored_files = [
        path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()
    ]

    assert response.status_code == 500
    assert response.json()["detail"] == "Memory could not be saved"
    assert stored_files == []
    assert session.exec(select(Memory)).all() == []


def test_public_memory_upload_respects_pending_storage_limit(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(pending_queue, "PUBLIC_PENDING_MEDIA_MAX_BYTES", 1)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Byłem tutaj",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    stored_files = [
        path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()
    ]

    assert response.status_code == 429
    assert response.json()["detail"] == "Pending media queue storage limit is reached"
    assert stored_files == []
    assert session.exec(select(Memory)).all() == []


def test_memory_upload_requires_publication_consent(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Dobra historia",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "false",
        },
    )

    assert response.status_code == 422


def test_memory_upload_requires_claim_token(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    short_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Dobra historia",
            "memory_text": MEMORY_TEXT,
            "claim_token": "short",
            "consent_confirmed": "true",
        },
    )
    long_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Dobra historia",
            "memory_text": MEMORY_TEXT,
            "claim_token": "x" * (MAX_CLAIM_TOKEN_LENGTH + 1),
            "consent_confirmed": "true",
        },
    )

    assert short_response.status_code == 422
    assert long_response.status_code == 422


def test_memory_upload_rejects_invalid_audio(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)

    def reject_too_long_audio(_content: bytes) -> float:
        raise HTTPException(status_code=413, detail="Audio duration is too long")

    monkeypatch.setattr(audio_service, "audio_duration_seconds", reject_too_long_audio)

    bad_type_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg"), "audio_file": ("clip.wav", b"audio", "audio/wav")},
        data={
            "caption": "Dobra historia",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    too_large_response = client.post(
        f"/api/places/{place.id}/memories",
        files={
            "file": image_upload("memory.jpg"),
            "audio_file": audio_upload("large.mp3", b"x" * (audio_service.MAX_AUDIO_BYTES + 1)),
        },
        data={
            "caption": "Dobra historia",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    too_long_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg"), "audio_file": audio_upload("long.mp3")},
        data={
            "caption": "Dobra historia",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    stored_files = [
        path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()
    ]

    assert bad_type_response.status_code == 422
    assert bad_type_response.json()["detail"] == "Unsupported audio file"
    assert too_large_response.status_code == 413
    assert too_large_response.json()["detail"] == "Audio file is too large"
    assert too_long_response.status_code == 413
    assert too_long_response.json()["detail"] == "Audio duration is too long"
    assert stored_files == []
    assert session.exec(select(Memory)).all() == []


def test_memory_upload_limits_text_field_lengths(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    caption_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "x" * (MAX_MEMORY_CAPTION_LENGTH + 1),
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    memory_text_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
        data={
            "caption": "Dobra historia",
            "memory_text": "x" * (MAX_MEMORY_TEXT_LENGTH + 1),
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    author_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
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


def test_public_memory_detail_requires_approved_memory_on_public_place(client_session) -> None:
    client, session = client_session
    public_place = create_place(session)
    draft_place = create_place(session, slug="draft-place", status="draft", title="Draft")
    approved_memory = Memory(
        place_id=public_place.id,
        caption="Publiczna",
        memory_text=MEMORY_TEXT,
        original_path="memories/public-private.jpg",
        public_path="/media/memories/public.jpg",
        thumb_path="/media/memories/public-thumb.jpg",
        status="approved",
        claim_token_hash=claim_token_hash("public-token"),
    )
    pending_memory = Memory(
        place_id=public_place.id,
        caption="Pending",
        memory_text=MEMORY_TEXT,
        original_path="memories/pending-private.jpg",
        public_path="/media/memories/pending.jpg",
        thumb_path="/media/memories/pending-thumb.jpg",
        status="pending",
        claim_token_hash=claim_token_hash("pending-token"),
    )
    hidden_memory = Memory(
        place_id=draft_place.id,
        caption="Hidden",
        memory_text=MEMORY_TEXT,
        original_path="memories/hidden-private.jpg",
        public_path="/media/memories/hidden.jpg",
        thumb_path="/media/memories/hidden-thumb.jpg",
        status="approved",
        claim_token_hash=claim_token_hash("hidden-token"),
    )
    session.add(approved_memory)
    session.add(pending_memory)
    session.add(hidden_memory)
    session.commit()
    session.refresh(approved_memory)
    session.refresh(pending_memory)
    session.refresh(hidden_memory)

    approved_response = client.get(f"/api/places/{public_place.id}/memories/{approved_memory.id}")
    pending_response = client.get(f"/api/places/{public_place.id}/memories/{pending_memory.id}")
    hidden_response = client.get(f"/api/places/{draft_place.id}/memories/{hidden_memory.id}")

    assert approved_response.status_code == 200
    assert approved_response.json()["memory_text"] == MEMORY_TEXT
    assert "original_path" not in approved_response.json()
    assert pending_response.status_code == 404
    assert hidden_response.status_code == 404
