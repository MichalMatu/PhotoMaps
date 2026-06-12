from pathlib import Path

from conftest import ADMIN_HEADERS, create_place, image_upload
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

from app.models.memory import Memory
from app.services.memory_fields import MAX_MEMORY_AUTHOR_LENGTH, MAX_MEMORY_CAPTION_LENGTH, MAX_MEMORY_TEXT_LENGTH
from app.services.tokens import MAX_CLAIM_TOKEN_LENGTH, claim_token_hash

MEMORY_TOKEN = "secret-token"
MEMORY_TEXT = "Krótka myśl z tego miejsca"


def test_memory_upload_stays_pending_and_hidden_publicly(client_session) -> None:
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


def test_memory_review_approves_and_updates_place_count(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    upload_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
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


def test_memory_claim_update_and_delete_use_same_token(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)
    upload_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
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


def test_memory_claim_rejects_missing_stored_hash(client_session) -> None:
    client, session = client_session
    place = create_place(session)
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
        claim_token_hash="",
    )
    session.add(memory)
    session.commit()
    session.refresh(memory)

    response = client.post(
        f"/api/places/{place.id}/memories/{memory.id}/claim",
        json={"claim_token": MEMORY_TOKEN},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid memory token"


def test_memory_hash_is_not_plaintext(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": image_upload("memory.jpg")},
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


def test_admin_memory_list_ignores_records_without_place(client_session) -> None:
    client, session = client_session
    session.add(
        Memory(
            place_id="deleted-place",
            caption="Pamiątka",
            memory_text=MEMORY_TEXT,
            original_path="memories/orphan-original.jpg",
            public_path="/media/memories/orphan.jpg",
            thumb_path="/media/memories/orphan-thumb.jpg",
            status="approved",
            claim_token_hash=claim_token_hash(MEMORY_TOKEN),
        )
    )
    session.commit()

    response = client.get("/api/admin/memories", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.json() == []


def test_admin_can_update_memory_text_fields(client_session) -> None:
    client, session = client_session
    place = create_place(session)
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


def test_admin_delete_memory_removes_record_files_and_updates_place(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)

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
