from datetime import UTC, datetime

from conftest import ADMIN_HEADERS
from sqlmodel import select

from app.models.category import Category
from app.models.guide import Guide, PlaceGuide
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place, PlaceCategory
from app.models.report import Report
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
    session.add(Place(city_id="wroclaw", slug="public-place", title="Public", lat=51.11, lon=17.03, status="published"))
    session.add(Place(city_id="wroclaw", slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
    session.commit()

    response = client.get("/api/places")

    assert response.status_code == 200
    assert [place["slug"] for place in response.json()] == ["public-place"]


def test_public_place_detail_hides_draft_and_archived(client_session) -> None:
    client, session = client_session
    session.add(Place(city_id="wroclaw", slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
    session.add(Place(city_id="wroclaw", slug="old-place", title="Old", lat=51.13, lon=17.05, status="archived"))
    session.commit()

    assert client.get("/api/places/draft-place").status_code == 404
    assert client.get("/api/places/old-place").status_code == 404


def test_admin_can_list_and_archive_places(client_session) -> None:
    client, session = client_session
    place = Place(city_id="wroclaw", slug="admin-place", title="Admin", lat=51.12, lon=17.04, status="draft")
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


def test_admin_can_permanently_delete_place_with_related_content(client_session, tmp_path) -> None:
    client, session = client_session
    category = Category(id="coffee", label="Kawa", status="active")
    place = Place(city_id="wroclaw", slug="delete-me", title="Delete me", lat=51.12, lon=17.04, status="draft")
    guide = Guide(slug="delete-guide", title="Delete guide")
    session.add(category)
    session.add(place)
    session.add(guide)
    session.commit()
    session.refresh(place)
    session.refresh(guide)

    photo_paths = (
        f"photos/{place.id}/photo-original.jpg",
        f"/media/photos/{place.id}/photo.jpg",
        f"/media/photos/{place.id}/photo-thumb.jpg",
    )
    memory_paths = (
        f"memories/{place.id}/memory-original.jpg",
        f"/media/memories/{place.id}/memory.jpg",
        f"/media/memories/{place.id}/memory-thumb.jpg",
    )
    for relative_path in (photo_paths[0], memory_paths[0]):
        path = tmp_path / "private" / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("private")
    for media_path in (photo_paths[1], photo_paths[2], memory_paths[1], memory_paths[2]):
        path = tmp_path / "public" / media_path.removeprefix("/media/")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("public")

    photo = Photo(
        place_id=place.id,
        original_path=photo_paths[0],
        public_path=photo_paths[1],
        thumb_path=photo_paths[2],
        status="approved",
    )
    memory = Memory(
        place_id=place.id,
        caption="Byłem tutaj",
        memory_text="Do usunięcia",
        original_path=memory_paths[0],
        public_path=memory_paths[1],
        thumb_path=memory_paths[2],
        status="approved",
        claim_token_hash=claim_token_hash("secret-token"),
    )
    session.add(photo)
    session.add(memory)
    session.commit()
    session.refresh(photo)
    session.refresh(memory)
    session.add(PlaceCategory(place_id=place.id, category_id=category.id))
    session.add(PlaceGuide(place_id=place.id, guide_id=guide.id))
    session.add(Report(target_type="place", target_id=place.id, reason="wrong_data"))
    session.add(Report(target_type="photo", target_id=photo.id, reason="wrong_data"))
    session.add(Report(target_type="memory", target_id=memory.id, reason="wrong_data"))
    session.add(Report(target_type="guide", target_id=guide.id, reason="wrong_data"))
    session.commit()

    response = client.delete(f"/api/admin/places/{place.id}?force=true", headers=ADMIN_HEADERS)

    assert response.status_code == 204
    assert session.get(Place, place.id) is None
    assert session.get(Photo, photo.id) is None
    assert session.get(Memory, memory.id) is None
    assert session.get(PlaceCategory, (place.id, category.id)) is None
    assert session.get(PlaceGuide, (guide.id, place.id)) is None
    assert session.exec(select(Report).where(Report.target_id.in_([place.id, photo.id, memory.id]))).all() == []
    assert session.exec(select(Report).where(Report.target_type == "guide")).one().target_id == guide.id
    assert not (tmp_path / "private" / photo_paths[0]).exists()
    assert not (tmp_path / "public" / photo_paths[1].removeprefix("/media/")).exists()
    assert not (tmp_path / "private" / memory_paths[0]).exists()
    assert not (tmp_path / "public" / memory_paths[1].removeprefix("/media/")).exists()


def test_map_places_return_ranked_public_summary_without_private_paths(client_session) -> None:
    client, session = client_session
    category = Category(id="coffee", label="Kawa", sort_order=1)
    top_place = Place(
        city_id="wroclaw",
        slug="top-place",
        title="Top",
        lat=51.11,
        lon=17.03,
        status="published",
        photo_count=1,
        memory_count=2,
        weight=2,
    )
    lower_place = Place(
        city_id="wroclaw",
        slug="lower-place",
        title="Lower",
        lat=51.12,
        lon=17.04,
        status="published",
        photo_count=1,
        memory_count=0,
        weight=1,
    )
    draft_place = Place(city_id="wroclaw", slug="draft-place", title="Draft", lat=51.13, lon=17.05, status="draft")
    session.add(category)
    session.add(top_place)
    session.add(lower_place)
    session.add(draft_place)
    session.commit()
    session.refresh(top_place)
    session.refresh(lower_place)
    session.add(PlaceCategory(place_id=top_place.id, category_id=category.id, sort_order=0))
    session.add(PlaceCategory(place_id=lower_place.id, category_id=category.id, sort_order=0))
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
    assert body[0]["city"]["id"] == "wroclaw"
    assert body[0]["category_ids"] == ["coffee"]
    assert body[0]["categories"][0]["id"] == "coffee"
    assert body[0]["cover_photo"]["thumb_path"] == "/media/photos/thumb.jpg"
    assert "original_path" not in body[0]["cover_photo"]
    assert [item["kind"] for item in body[0]["preview_items"]] == ["photo", "memory"]
    assert body[0]["preview_items"][0]["id"] == cover_photo.id
    assert body[0]["preview_items"][1]["id"] == memory.id
    assert body[0]["preview_items"][1]["memory_text"] == "Myśl z miejsca"
    assert body[0]["preview_items"][1]["thumb_path"] == "/media/memories/thumb.jpg"
    assert "original_path" not in body[0]["preview_items"][1]


def test_public_media_contracts_never_return_original_path(client_session) -> None:
    client, session = client_session
    place = Place(
        city_id="wroclaw",
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
