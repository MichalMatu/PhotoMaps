from datetime import UTC, datetime

from conftest import ADMIN_HEADERS

from app.models.category import Category
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.services.tokens import claim_token_hash


def assert_no_private_original_path(payload) -> None:
    if isinstance(payload, dict):
        assert "original_path" not in payload
        for value in payload.values():
            assert_no_private_original_path(value)
    elif isinstance(payload, list):
        for item in payload:
            assert_no_private_original_path(item)


def test_public_places_only_show_published(client_session) -> None:
    client, session = client_session
    session.add(Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published"))
    session.add(Place(slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
    session.commit()

    response = client.get("/api/places")

    assert response.status_code == 200
    assert [place["slug"] for place in response.json()] == ["public-place"]


def test_public_place_detail_hides_draft_and_archived(client_session) -> None:
    client, session = client_session
    session.add(Place(slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
    session.add(Place(slug="old-place", title="Old", lat=51.13, lon=17.05, status="archived"))
    session.commit()

    assert client.get("/api/places/draft-place").status_code == 404
    assert client.get("/api/places/old-place").status_code == 404


def test_admin_can_list_and_archive_places(client_session) -> None:
    client, session = client_session
    place = Place(slug="admin-place", title="Admin", lat=51.12, lon=17.04, status="draft")
    session.add(place)
    session.commit()
    session.refresh(place)

    list_response = client.get("/api/admin/places", headers=ADMIN_HEADERS)
    archive_response = client.delete(f"/api/admin/places/{place.id}", headers=ADMIN_HEADERS)

    assert list_response.status_code == 200
    assert list_response.json()[0]["slug"] == "admin-place"
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"
    assert session.get(Place, place.id) is not None


def test_map_places_return_ranked_public_summary_without_private_paths(client_session) -> None:
    client, session = client_session
    category = Category(id="coffee", label="Kawa", sort_order=1)
    top_place = Place(
        slug="top-place",
        title="Top",
        category_id=category.id,
        lat=51.11,
        lon=17.03,
        status="published",
        photo_count=1,
        memory_count=2,
        weight=2,
    )
    lower_place = Place(
        slug="lower-place",
        title="Lower",
        category_id=category.id,
        lat=51.12,
        lon=17.04,
        status="published",
        photo_count=1,
        memory_count=0,
        weight=1,
    )
    draft_place = Place(slug="draft-place", title="Draft", lat=51.13, lon=17.05, status="draft")
    session.add(category)
    session.add(top_place)
    session.add(lower_place)
    session.add(draft_place)
    session.commit()
    session.refresh(top_place)
    cover_photo = Photo(
        place_id=top_place.id,
        original_path="photos/private-original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    memory = Memory(
        place_id=top_place.id,
        author_name="Gość",
        caption="Byłem tutaj",
        memory_text="Myśl z miejsca",
        original_path="memories/private-original.jpg",
        public_path="/media/memories/public.jpg",
        thumb_path="/media/memories/thumb.jpg",
        status="approved",
        claim_token_hash=claim_token_hash("secret-token"),
        approved_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    session.add(cover_photo)
    session.add(memory)
    session.commit()
    session.refresh(cover_photo)
    session.refresh(memory)
    top_place.cover_photo_id = cover_photo.id
    session.add(top_place)
    session.commit()

    response = client.get("/api/places/map")

    assert response.status_code == 200
    body = response.json()
    assert [place["slug"] for place in body] == ["top-place", "lower-place"]
    assert body[0]["category"]["id"] == "coffee"
    assert body[0]["cover_photo"]["thumb_path"] == "/media/photos/thumb.jpg"
    assert "original_path" not in body[0]["cover_photo"]
    assert body[0]["photos"][0]["id"] == cover_photo.id
    assert body[0]["memories"][0]["id"] == memory.id
    assert body[0]["memories"][0]["memory_text"] == "Myśl z miejsca"
    assert body[0]["memories"][0]["thumb_path"] == "/media/memories/thumb.jpg"
    assert "original_path" not in body[0]["memories"][0]


def test_public_media_contracts_never_return_original_path(client_session) -> None:
    client, session = client_session
    place = Place(
        slug="media-place",
        title="Media",
        lat=51.11,
        lon=17.03,
        status="published",
        photo_count=1,
        memory_count=1,
    )
    session.add(place)
    session.commit()
    session.refresh(place)
    photo = Photo(
        place_id=place.id,
        original_path="photos/private-original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    memory = Memory(
        place_id=place.id,
        author_name="Gość",
        caption="Byłem tutaj",
        memory_text="Myśl z miejsca",
        original_path="memories/private-original.jpg",
        public_path="/media/memories/public.jpg",
        thumb_path="/media/memories/thumb.jpg",
        status="approved",
        claim_token_hash=claim_token_hash("secret-token"),
        approved_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    session.add(photo)
    session.add(memory)
    session.commit()
    session.refresh(photo)
    place.cover_photo_id = photo.id
    session.add(place)
    session.commit()

    responses = [
        client.get("/api/places"),
        client.get("/api/places/map"),
        client.get(f"/api/places/{place.slug}"),
        client.get(f"/api/places/{place.id}/photos"),
        client.get(f"/api/places/{place.id}/memories"),
    ]

    for response in responses:
        assert response.status_code == 200
        assert_no_private_original_path(response.json())
