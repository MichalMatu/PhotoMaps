from datetime import UTC, datetime
from pathlib import Path

from PIL import Image

from app.models.memory import Memory
from app.services.media import audio as audio_service
from app.services.tokens import claim_token_hash
from app.tests.support import ADMIN_HEADERS, audio_upload, create_place, detailed_image_upload, image_upload

MEMORY_TOKEN = "secret-token"
MEMORY_TEXT = "Krótka myśl z tego miejsca"


def image_pixel(path: Path, xy: tuple[int, int]) -> tuple[int, int, int]:
    with Image.open(path) as image:
        return image.convert("RGB").getpixel(xy)


def assert_blurred_pixel(value: tuple[int, int, int]) -> None:
    assert 40 < value[0] < 220
    assert 40 < value[1] < 220
    assert 40 < value[2] < 220


def test_admin_can_replace_and_delete_existing_memory_audio(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(audio_service, "audio_duration_seconds", lambda _content: 2.5)
    monkeypatch.setattr(audio_service, "strip_public_audio_metadata", lambda _path: None)

    old_audio_original = Path("memories") / place.id / "old-audio-original.mp3"
    old_audio_public = Path("memories") / place.id / "old-audio.mp3"
    old_private_file = tmp_path / "private" / old_audio_original
    old_public_file = tmp_path / "public" / old_audio_public
    old_private_file.parent.mkdir(parents=True, exist_ok=True)
    old_public_file.parent.mkdir(parents=True, exist_ok=True)
    old_private_file.write_bytes(b"old-private-audio")
    old_public_file.write_bytes(b"old-public-audio")
    memory = Memory(
        place_id=place.id,
        caption="Pamiątka",
        memory_text=MEMORY_TEXT,
        original_path="memories/existing-original.jpg",
        public_path="/media/memories/existing.jpg",
        thumb_path="/media/memories/existing-thumb.jpg",
        audio_original_path=old_audio_original.as_posix(),
        audio_public_path=f"/media/{old_audio_public.as_posix()}",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=len(b"old-public-audio"),
        audio_duration_seconds=1.25,
        status="approved",
        approved_at=datetime.now(UTC),
        claim_token_hash=claim_token_hash(MEMORY_TOKEN),
    )
    session.add(memory)
    session.commit()
    session.refresh(memory)

    replace_response = client.put(
        f"/api/admin/memories/{memory.id}/audio",
        headers=ADMIN_HEADERS,
        files={"audio_file": audio_upload("new.mp3", b"new-audio")},
    )
    session.refresh(memory)
    new_private_file = tmp_path / "private" / memory.audio_original_path
    new_public_file = tmp_path / "public" / memory.audio_public_path.removeprefix("/media/")
    public_response = client.get(f"/api/places/{place.id}/memories")

    assert replace_response.status_code == 200
    assert replace_response.json()["audio"] == {
        "duration_seconds": 2.5,
        "mime_type": "audio/mpeg",
        "public_path": memory.audio_public_path,
        "size_bytes": len(b"new-audio"),
    }
    assert "audio_original_path" not in replace_response.json()
    assert not old_private_file.exists()
    assert not old_public_file.exists()
    assert new_private_file.exists()
    assert new_public_file.exists()
    assert public_response.json()[0]["audio"]["public_path"] == memory.audio_public_path

    delete_response = client.delete(f"/api/admin/memories/{memory.id}/audio", headers=ADMIN_HEADERS)
    session.refresh(memory)
    public_response_after_delete = client.get(f"/api/places/{place.id}/memories")

    assert delete_response.status_code == 200
    assert delete_response.json()["audio"] is None
    assert memory.audio_original_path is None
    assert memory.audio_public_path is None
    assert not new_private_file.exists()
    assert not new_public_file.exists()
    assert public_response_after_delete.json()[0]["audio"] is None


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


def test_admin_memory_list_applies_queue_limit(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    for index in range(3):
        session.add(
            Memory(
                place_id=place.id,
                caption=f"Pamiątka {index}",
                memory_text=MEMORY_TEXT,
                original_path=f"memories/{index}-original.jpg",
                public_path=f"/media/memories/{index}.jpg",
                thumb_path=f"/media/memories/{index}-thumb.jpg",
                status="pending",
                created_at=datetime(2026, 1, index + 1, tzinfo=UTC),
                claim_token_hash=claim_token_hash(f"{MEMORY_TOKEN}-{index}"),
            )
        )
    session.commit()

    response = client.get("/api/admin/memories?limit=2", headers=ADMIN_HEADERS)
    next_response = client.get("/api/admin/memories?limit=2&offset=2", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert next_response.status_code == 200
    assert len(next_response.json()) == 1
    assert {memory["id"] for memory in response.json()}.isdisjoint({memory["id"] for memory in next_response.json()})


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


def test_admin_can_redact_memory_by_polygon(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)
    upload_response = client.post(
        f"/api/places/{place.id}/memories",
        files={"file": detailed_image_upload("memory.jpg")},
        data={
            "caption": "Dobra historia",
            "memory_text": MEMORY_TEXT,
            "claim_token": MEMORY_TOKEN,
            "consent_confirmed": "true",
        },
    )
    memory = session.get(Memory, upload_response.json()["id"])
    assert memory is not None
    private_file = tmp_path / "private" / memory.original_path

    response = client.post(
        f"/api/admin/memories/{memory.id}/redaction",
        headers=ADMIN_HEADERS,
        json={
            "rectangles": [],
            "polygons": [
                [
                    {"x": 0, "y": 0},
                    {"x": 1, "y": 0},
                    {"x": 1, "y": 1},
                    {"x": 0, "y": 1},
                ]
            ],
        },
    )
    assert response.status_code == 200
    assert response.json()["summary"]["actions"]["applied"] == 1
    assert response.json()["actions"][0]["action"] == "redact_image"
    assert response.json()["actions"][0]["label"] == "private_original"
    assert response.json()["issues"] == []
    assert_blurred_pixel(image_pixel(private_file, (16, 16)))

    review_response = client.post(
        f"/api/admin/memories/{memory.id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    session.refresh(memory)
    assert memory.public_path is not None
    public_file = tmp_path / "public" / memory.public_path.removeprefix("/media/")

    assert review_response.status_code == 200
    assert_blurred_pixel(image_pixel(public_file, (16, 16)))


def test_admin_delete_memory_removes_record_files_and_updates_place(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)

    original_path = Path("memories") / place.id / "memory-original.jpg"
    public_path = Path("memories") / place.id / "memory.jpg"
    thumb_path = Path("memories") / place.id / "memory-thumb.jpg"
    audio_original_path = Path("memories") / place.id / "memory-audio-original.mp3"
    audio_public_path = Path("memories") / place.id / "memory-audio.mp3"
    private_file = tmp_path / "private" / original_path
    private_audio_file = tmp_path / "private" / audio_original_path
    public_file = tmp_path / "public" / public_path
    thumb_file = tmp_path / "public" / thumb_path
    public_audio_file = tmp_path / "public" / audio_public_path
    private_file.parent.mkdir(parents=True, exist_ok=True)
    public_file.parent.mkdir(parents=True, exist_ok=True)
    private_file.write_bytes(b"private")
    private_audio_file.write_bytes(b"private-audio")
    public_file.write_bytes(b"public")
    thumb_file.write_bytes(b"thumb")
    public_audio_file.write_bytes(b"public-audio")

    memory = Memory(
        place_id=place.id,
        author_name="Marta",
        caption="Pamiątka",
        memory_text=MEMORY_TEXT,
        original_path=original_path.as_posix(),
        public_path=f"/media/{public_path.as_posix()}",
        thumb_path=f"/media/{thumb_path.as_posix()}",
        audio_original_path=audio_original_path.as_posix(),
        audio_public_path=f"/media/{audio_public_path.as_posix()}",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=len(b"public-audio"),
        audio_duration_seconds=1.25,
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
    assert not private_audio_file.exists()
    assert not public_file.exists()
    assert not public_audio_file.exists()
    assert not thumb_file.exists()
