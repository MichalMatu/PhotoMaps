from pathlib import Path

from PIL import Image

from app.models.memory import Memory
from app.services.tokens import claim_token_hash
from app.tests.support import ADMIN_HEADERS, create_place, image_upload

MEMORY_TOKEN = "secret-token"
MEMORY_TEXT = "Krótka myśl z tego miejsca"


def image_pixel(path: Path, xy: tuple[int, int]) -> tuple[int, int, int]:
    with Image.open(path) as image:
        return image.convert("RGB").getpixel(xy)


def assert_blurred_pixel(value: tuple[int, int, int]) -> None:
    assert 40 < value[0] < 220
    assert 40 < value[1] < 220
    assert 40 < value[2] < 220


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
