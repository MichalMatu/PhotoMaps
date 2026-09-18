from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.models.memory import Memory
from app.models.place import Place
from app.services import memory_uploads
from app.services.admin_memories import review_admin_memory
from app.services.media import audio as audio_service
from app.tests.support import ADMIN_HEADERS, audio_upload, create_place, image_upload

MEMORY_TOKEN = "transaction-test-token"
MEMORY_TEXT = "Pamiątka do testu transakcyjności"


def upload_pending_memory(client, place_id: str, *, with_audio: bool = False) -> str:
    files = {"file": image_upload("memory.jpg")}
    if with_audio:
        files["audio_file"] = audio_upload("memory.mp3", b"test-audio")
    response = client.post(
        f"/api/places/{place_id}/memories",
        files=files,
        data={
            "caption": "Pamiątka",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def public_memory_dir(tmp_path: Path, place_id: str) -> Path:
    return tmp_path / "public" / "memories" / place_id


def test_memory_approval_audio_publish_failure_cleans_published_image(
    client_session, tmp_path: Path, monkeypatch
) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(audio_service, "audio_duration_seconds", lambda _content: 1.0)
    memory_id = upload_pending_memory(client, place.id, with_audio=True)

    def fail_audio_publish(_original_path: str):
        raise HTTPException(status_code=422, detail="forced audio publish failure")

    monkeypatch.setattr(memory_uploads, "publish_private_audio", fail_audio_publish)

    response = client.post(
        f"/api/admin/memories/{memory_id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    session.expire_all()
    memory = session.get(Memory, memory_id)
    refreshed_place = session.get(Place, place.id)

    assert response.status_code == 422
    assert memory is not None
    assert memory.status == "pending"
    assert memory.public_path is None
    assert memory.thumb_path is None
    assert memory.audio_public_path is None
    assert refreshed_place is not None
    assert refreshed_place.memory_count == 0
    assert not public_memory_dir(tmp_path, place.id).exists()


def test_memory_approval_commit_failure_removes_new_public_media(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    memory_id = upload_pending_memory(client, place.id)

    def fail_commit() -> None:
        raise SQLAlchemyError("forced commit failure")

    monkeypatch.setattr(session, "commit", fail_commit)

    with pytest.raises(HTTPException) as exc_info:
        review_admin_memory(session, memory_id, "approved")

    session.expire_all()
    memory = session.get(Memory, memory_id)
    refreshed_place = session.get(Place, place.id)

    assert exc_info.value.status_code == 500
    assert memory is not None
    assert memory.status == "pending"
    assert memory.public_path is None
    assert memory.thumb_path is None
    assert memory.audio_public_path is None
    assert refreshed_place is not None
    assert refreshed_place.memory_count == 0
    assert not public_memory_dir(tmp_path, place.id).exists()


def test_memory_rejection_commit_failure_keeps_existing_public_media(
    client_session, tmp_path: Path, monkeypatch
) -> None:
    client, session = client_session
    place = create_place(session)
    memory_id = upload_pending_memory(client, place.id)
    approved_response = client.post(
        f"/api/admin/memories/{memory_id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    assert approved_response.status_code == 200

    session.expire_all()
    memory = session.get(Memory, memory_id)
    assert memory is not None
    assert memory.public_path is not None
    assert memory.thumb_path is not None
    public_file = tmp_path / "public" / memory.public_path.removeprefix("/media/")
    thumb_file = tmp_path / "public" / memory.thumb_path.removeprefix("/media/")
    assert public_file.exists()
    assert thumb_file.exists()

    def fail_commit() -> None:
        raise SQLAlchemyError("forced commit failure")

    monkeypatch.setattr(session, "commit", fail_commit)

    with pytest.raises(HTTPException) as exc_info:
        review_admin_memory(session, memory_id, "rejected")

    session.expire_all()
    memory = session.get(Memory, memory_id)
    refreshed_place = session.get(Place, place.id)

    assert exc_info.value.status_code == 500
    assert memory is not None
    assert memory.status == "approved"
    assert memory.public_path is not None
    assert memory.thumb_path is not None
    assert refreshed_place is not None
    assert refreshed_place.memory_count == 1
    assert public_file.exists()
    assert thumb_file.exists()
