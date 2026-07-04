from datetime import UTC, datetime

from sqlmodel import select

from app.models.category import Category
from app.models.guide import Guide, PlaceGuide
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place, PlaceCategory
from app.models.report import Report
from app.services.tokens import claim_token_hash
from app.tests.support import ADMIN_HEADERS


def assert_no_private_original_path(payload) -> None:
    if isinstance(payload, dict):
        assert "audio_original_path" not in payload
        assert "original_path" not in payload
        for value in payload.values():
            assert_no_private_original_path(value)
    elif isinstance(payload, list):
        for item in payload:
            assert_no_private_original_path(item)


def add_approved_photo(session, place: Place, suffix: str, *, as_cover: bool = False) -> Photo:
    photo = Photo(
        place_id=place.id,
        original_path=f"photos/{suffix}-private.jpg",
        public_path=f"/media/photos/{suffix}.jpg",
        thumb_path=f"/media/photos/{suffix}-thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    if as_cover:
        place.cover_photo_id = photo.id
        session.add(place)
        session.commit()
    return photo


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


def test_admin_can_create_and_update_place_article_blocks(client_session) -> None:
    client, session = client_session

    created_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "article-admin-place",
            "title": "Article admin",
            "lat": 51.12,
            "lon": 17.04,
            "status": "draft",
            "article_blocks": [
                {"type": "heading", "text": "  Duży tytuł  "},
                {"type": "subheading", "text": "Sekcja"},
                {"type": "paragraph", "text": "Normalny akapit."},
                {"type": "link", "text": "YouTube", "url": " https://www.youtube.com/watch?v=abc "},
            ],
        },
    )

    assert created_response.status_code == 201
    created_body = created_response.json()
    assert created_body["article_blocks"] == [
        {"type": "heading", "text": "Duży tytuł", "url": None},
        {"type": "subheading", "text": "Sekcja", "url": None},
        {"type": "paragraph", "text": "Normalny akapit.", "url": None},
        {"type": "link", "text": "YouTube", "url": "https://www.youtube.com/watch?v=abc"},
    ]

    place = session.exec(select(Place).where(Place.slug == "article-admin-place")).one()
    update_response = client.patch(
        f"/api/admin/places/{place.id}",
        headers=ADMIN_HEADERS,
        json={"article_blocks": [{"type": "link", "text": "Mapa", "url": "https://example.com/mapa"}]},
    )
    session.refresh(place)

    assert update_response.status_code == 200
    assert update_response.json()["article_blocks"] == [
        {"type": "link", "text": "Mapa", "url": "https://example.com/mapa"}
    ]
    assert place.article_blocks == [{"type": "link", "text": "Mapa", "url": "https://example.com/mapa"}]


def test_admin_rejects_invalid_place_article_link_blocks(client_session) -> None:
    client, _session = client_session

    missing_url_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "missing-article-link-url",
            "title": "Missing link URL",
            "lat": 51.12,
            "lon": 17.04,
            "article_blocks": [{"type": "link", "text": "YouTube"}],
        },
    )
    text_block_url_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "text-article-url",
            "title": "Text URL",
            "lat": 51.12,
            "lon": 17.04,
            "article_blocks": [{"type": "paragraph", "text": "Opis", "url": "https://example.com"}],
        },
    )
    unsafe_url_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "unsafe-article-url",
            "title": "Unsafe URL",
            "lat": 51.12,
            "lon": 17.04,
            "article_blocks": [{"type": "link", "text": "Zły link", "url": "javascript:alert(1)"}],
        },
    )

    assert missing_url_response.status_code == 422
    assert text_block_url_response.status_code == 422
    assert unsafe_url_response.status_code == 422


def test_admin_place_custom_fields_are_validated_and_normalized(client_session) -> None:
    client, _session = client_session

    created_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "custom-place",
            "title": "Custom",
            "lat": 51.12,
            "lon": 17.04,
            "status": "published",
            "custom_fields": {
                "accessibility": "pełna",
                "booking_url": "https://example.com/book",
                "contact": "",
                "opening_hours": " 10-18 ",
                "price": "12.50",
            },
        },
    )
    unknown_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "bad-custom-place",
            "title": "Bad",
            "lat": 51.12,
            "lon": 17.04,
            "custom_fields": {"unsupported": "value"},
        },
    )
    select_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "bad-select-place",
            "title": "Bad select",
            "lat": 51.12,
            "lon": 17.04,
            "custom_fields": {"accessibility": "dowolna"},
        },
    )
    url_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "bad-url-place",
            "title": "Bad URL",
            "lat": 51.12,
            "lon": 17.04,
            "custom_fields": {"booking_url": "example.com"},
        },
    )

    assert created_response.status_code == 201
    assert created_response.json()["custom_fields"] == {
        "opening_hours": "10-18",
        "price": 12.5,
        "booking_url": "https://example.com/book",
        "accessibility": "pełna",
    }
    assert unknown_response.status_code == 422
    assert "unsupported fields: unsupported" in unknown_response.json()["detail"]
    assert select_response.status_code == 422
    assert "accessibility" in select_response.json()["detail"]
    assert url_response.status_code == 422
    assert "valid URL" in url_response.json()["detail"]


def test_admin_place_cover_update_accepts_clear_and_validates_photo(client_session) -> None:
    client, session = client_session
    place = Place(city_id="wroclaw", slug="cover-place", title="Cover", lat=51.12, lon=17.04, status="draft")
    other_place = Place(
        city_id="wroclaw", slug="other-cover-place", title="Other", lat=51.13, lon=17.05, status="draft"
    )
    session.add(place)
    session.add(other_place)
    session.commit()
    session.refresh(place)
    session.refresh(other_place)
    approved_photo = Photo(
        place_id=place.id,
        original_path="photos/approved-original.jpg",
        public_path="/media/photos/approved.jpg",
        thumb_path="/media/photos/approved-thumb.jpg",
        status="approved",
    )
    pending_photo = Photo(
        place_id=place.id,
        original_path="photos/pending-original.jpg",
        public_path="/media/photos/pending.jpg",
        thumb_path="/media/photos/pending-thumb.jpg",
        status="pending",
    )
    other_photo = Photo(
        place_id=other_place.id,
        original_path="photos/other-original.jpg",
        public_path="/media/photos/other.jpg",
        thumb_path="/media/photos/other-thumb.jpg",
        status="approved",
    )
    session.add(approved_photo)
    session.add(pending_photo)
    session.add(other_photo)
    session.commit()
    session.refresh(approved_photo)
    session.refresh(pending_photo)
    session.refresh(other_photo)

    pending_response = client.patch(
        f"/api/admin/places/{place.id}",
        headers=ADMIN_HEADERS,
        json={"cover_photo_id": pending_photo.id},
    )
    other_place_response = client.patch(
        f"/api/admin/places/{place.id}",
        headers=ADMIN_HEADERS,
        json={"cover_photo_id": other_photo.id},
    )
    set_response = client.patch(
        f"/api/admin/places/{place.id}",
        headers=ADMIN_HEADERS,
        json={"cover_photo_id": approved_photo.id},
    )
    clear_response = client.patch(
        f"/api/admin/places/{place.id}",
        headers=ADMIN_HEADERS,
        json={"cover_photo_id": None},
    )
    session.refresh(place)

    assert pending_response.status_code == 422
    assert other_place_response.status_code == 422
    assert set_response.status_code == 200
    assert set_response.json()["cover_photo_id"] == approved_photo.id
    assert clear_response.status_code == 200
    assert clear_response.json()["cover_photo_id"] is None
    assert place.cover_photo_id is None


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
