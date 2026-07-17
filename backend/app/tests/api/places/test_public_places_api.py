from datetime import UTC, datetime

from app.models.category import Category
from app.models.city import City
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place, PlaceCategory
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


def test_public_places_only_show_published(client_session) -> None:
    client, session = client_session
    session.add(Place(city_id="wroclaw", slug="public-place", title="Public", lat=51.11, lon=17.03, status="published"))
    session.add(Place(city_id="wroclaw", slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
    session.commit()

    response = client.get("/api/places")

    assert response.status_code == 200
    body = response.json()
    assert [place["slug"] for place in body] == ["public-place"]
    assert "local_comment" not in body[0]
    assert "status" not in body[0]


def test_public_place_detail_hides_draft_and_archived(client_session) -> None:
    client, session = client_session
    session.add(Place(city_id="wroclaw", slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
    session.add(Place(city_id="wroclaw", slug="old-place", title="Old", lat=51.13, lon=17.05, status="archived"))
    session.commit()

    assert client.get("/api/places/draft-place").status_code == 404
    assert client.get("/api/places/old-place").status_code == 404


def test_public_place_detail_returns_article_blocks_without_expanding_map_payload(client_session) -> None:
    client, session = client_session
    place = Place(
        city_id="wroclaw",
        slug="article-place",
        title="Article",
        lat=51.12,
        lon=17.04,
        status="published",
        article_blocks=[
            {"type": "heading", "text": "Pełny opis miejsca"},
            {"type": "paragraph", "text": "Dłuższy tekst do przewodnika po miejscu."},
            {"type": "link", "text": "Materiał zewnętrzny", "url": "https://example.com/material"},
        ],
    )
    session.add(place)
    session.commit()
    session.refresh(place)
    add_approved_photo(session, place, "article-place", as_cover=True)

    list_response = client.get("/api/places")
    map_response = client.get("/api/places/map?city_id=wroclaw")
    detail_response = client.get("/api/places/article-place")

    assert list_response.status_code == 200
    assert map_response.status_code == 200
    assert detail_response.status_code == 200
    assert "article_blocks" not in list_response.json()[0]
    assert "article_blocks" not in map_response.json()[0]
    assert "local_comment" not in detail_response.json()
    assert "status" not in detail_response.json()
    assert detail_response.json()["article_blocks"] == [
        {"type": "heading", "text": "Pełny opis miejsca", "url": None},
        {"type": "paragraph", "text": "Dłuższy tekst do przewodnika po miejscu.", "url": None},
        {"type": "link", "text": "Materiał zewnętrzny", "url": "https://example.com/material"},
    ]


def test_public_places_hide_places_from_archived_cities(client_session) -> None:
    client, session = client_session
    session.add(City(id="archived-city", name="Archived", lat=52.0, lon=18.0, status="archived"))
    active_place = Place(
        city_id="wroclaw", slug="active-city-place", title="Active", lat=51.11, lon=17.03, status="published"
    )
    session.add(active_place)
    hidden_place = Place(
        city_id="archived-city",
        slug="hidden-city-place",
        title="Hidden",
        lat=52.0,
        lon=18.0,
        status="published",
    )
    session.add(hidden_place)
    session.commit()
    session.refresh(active_place)
    session.refresh(hidden_place)
    add_approved_photo(session, active_place, "active-city-place", as_cover=True)

    places_response = client.get("/api/places")
    map_response = client.get("/api/places/map?city_id=wroclaw")

    assert places_response.status_code == 200
    assert map_response.status_code == 200
    assert [place["slug"] for place in places_response.json()] == ["active-city-place"]
    assert [place["slug"] for place in map_response.json()] == ["active-city-place"]
    assert client.get("/api/places/hidden-city-place").status_code == 404
    assert client.get(f"/api/places/{hidden_place.id}/photos").status_code == 404
    assert client.get(f"/api/places/{hidden_place.id}/memories").status_code == 404
    assert client.get("/api/places/map?city_id=archived-city").status_code == 404


def test_map_places_default_to_all_active_cities_and_allow_city_filter(client_session) -> None:
    client, session = client_session
    session.add(City(id="poznan", name="Poznań", lat=52.4064, lon=16.9252, status="active", sort_order=20))
    wroclaw_place = Place(
        city_id="wroclaw", slug="wroclaw-map-place", title="Wrocław", lat=51.11, lon=17.03, status="published"
    )
    poznan_place = Place(
        city_id="poznan", slug="poznan-map-place", title="Poznań", lat=52.4, lon=16.92, status="published"
    )
    session.add(wroclaw_place)
    session.add(poznan_place)
    session.commit()
    session.refresh(wroclaw_place)
    session.refresh(poznan_place)
    add_approved_photo(session, wroclaw_place, "wroclaw-map-place", as_cover=True)
    add_approved_photo(session, poznan_place, "poznan-map-place", as_cover=True)

    all_response = client.get("/api/places/map")
    unknown_response = client.get("/api/places/map?city_id=missing")
    wroclaw_response = client.get("/api/places/map?city_id=wroclaw")
    poznan_response = client.get("/api/places/map?city_id=poznan")

    assert all_response.status_code == 200
    assert unknown_response.status_code == 404
    assert wroclaw_response.status_code == 200
    assert poznan_response.status_code == 200
    assert {place["slug"] for place in all_response.json()} == {"poznan-map-place", "wroclaw-map-place"}
    assert [place["slug"] for place in wroclaw_response.json()] == ["wroclaw-map-place"]
    assert [place["slug"] for place in poznan_response.json()] == ["poznan-map-place"]


def test_public_place_custom_fields_only_expose_public_definitions(client_session) -> None:
    client, session = client_session
    app_config = client.get("/api/admin/app-config", headers=ADMIN_HEADERS).json()
    app_config["place_custom_fields"] = [
        {
            "key": "public_note",
            "label": "Public",
            "type": "text",
            "required": False,
            "public": True,
            "options": None,
            "sort_order": 1,
        },
        {
            "key": "internal_note",
            "label": "Internal",
            "type": "text",
            "required": False,
            "public": False,
            "options": None,
            "sort_order": 2,
        },
    ]
    config_response = client.put("/api/admin/app-config", headers=ADMIN_HEADERS, json=app_config)
    assert config_response.status_code == 200

    place = Place(
        city_id="wroclaw",
        slug="custom-public",
        title="Custom public",
        lat=51.12,
        lon=17.04,
        status="published",
        custom_fields={"public_note": "Visible", "internal_note": "Hidden"},
    )
    session.add(place)
    session.commit()
    session.refresh(place)
    add_approved_photo(session, place, "custom-public", as_cover=True)

    public_response = client.get("/api/places/custom-public")
    map_response = client.get("/api/places/map?city_id=wroclaw")
    admin_response = client.get("/api/admin/places", headers=ADMIN_HEADERS)

    assert public_response.status_code == 200
    assert public_response.json()["custom_fields"] == {"public_note": "Visible"}
    assert map_response.status_code == 200
    assert map_response.json()[0]["custom_fields"] == {"public_note": "Visible"}
    assert admin_response.status_code == 200
    assert admin_response.json()[0]["custom_fields"] == {"public_note": "Visible", "internal_note": "Hidden"}


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
        audio_original_path="photos/private-audio-original.mp3",
        audio_public_path="/media/photos/audio.mp3",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=123,
        audio_duration_seconds=1.25,
        description_blocks=[{"type": "paragraph", "text": "Opis zdjęcia do odsłuchu."}],
        status="approved",
        attribution_author="Marta",
        attribution_license="CC BY 4.0",
        attribution_license_url="https://creativecommons.org/licenses/by/4.0/",
        attribution_source_url="https://commons.wikimedia.org/wiki/File:Photo.jpg",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    lower_photo = Photo(
        place_id=lower_place.id,
        original_path="photos/lower-private-original.jpg",
        public_path="/media/photos/lower-public.jpg",
        thumb_path="/media/photos/lower-thumb.jpg",
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
        audio_original_path="memories/private-audio-original.mp3",
        audio_public_path="/media/memories/audio.mp3",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=456,
        audio_duration_seconds=2.5,
        status="approved",
        claim_token_hash=claim_token_hash("secret-token"),
        approved_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    session.add(cover_photo)
    session.add(lower_photo)
    session.add(memory)
    session.commit()
    session.refresh(cover_photo)
    session.refresh(memory)
    top_place.cover_photo_id = cover_photo.id
    session.add(top_place)
    session.commit()

    response = client.get("/api/places/map?city_id=wroclaw")

    assert response.status_code == 200
    body = response.json()
    assert [place["slug"] for place in body] == ["top-place", "lower-place"]
    assert body[0]["city"]["id"] == "wroclaw"
    assert "local_comment" not in body[0]
    assert "status" not in body[0]
    assert "created_at" not in body[0]
    assert "updated_at" not in body[0]
    assert "cover_photo_id" not in body[0]
    assert "article_blocks" not in body[0]
    assert body[0]["category_ids"] == ["coffee"]
    assert body[0]["categories"][0]["id"] == "coffee"
    assert body[0]["cover_photo"]["thumb_path"] == "/media/photos/thumb.jpg"
    assert body[0]["cover_photo"]["audio"]["public_path"] == "/media/photos/audio.mp3"
    assert body[0]["cover_photo"]["attribution_author"] == "Marta"
    assert body[0]["cover_photo"]["attribution_license"] == "CC BY 4.0"
    assert body[0]["cover_photo"]["attribution_license_url"] == "https://creativecommons.org/licenses/by/4.0/"
    assert body[0]["cover_photo"]["attribution_source_url"] == "https://commons.wikimedia.org/wiki/File:Photo.jpg"
    assert "original_path" not in body[0]["cover_photo"]
    assert [item["kind"] for item in body[0]["preview_items"]] == ["photo", "memory"]
    assert body[0]["preview_items"][0]["id"] == cover_photo.id
    assert body[0]["preview_items"][0]["role"] == "gallery"
    assert body[0]["preview_items"][0]["source"] == "editorial"
    assert body[0]["preview_items"][0]["attribution_author"] == "Marta"
    assert "attribution_author" not in body[0]["preview_items"][1]
    assert body[0]["preview_items"][0]["audio"]["public_path"] == "/media/photos/audio.mp3"
    assert body[0]["preview_items"][1]["id"] == memory.id
    assert body[0]["preview_items"][1]["audio"]["public_path"] == "/media/memories/audio.mp3"
    assert "role" not in body[0]["preview_items"][1]
    assert "source" not in body[0]["preview_items"][1]
    assert "memory_text" not in body[0]["preview_items"][1]
    assert "share_slug" not in body[0]["preview_items"][1]
    assert "status" not in body[0]["preview_items"][1]
    assert body[0]["preview_items"][1]["thumb_path"] == "/media/memories/thumb.jpg"
    assert "original_path" not in body[0]["preview_items"][1]


def test_map_preview_keeps_memories_when_place_has_many_photos(client_session) -> None:
    client, session = client_session
    place = Place(city_id="wroclaw", slug="busy-place", title="Busy", lat=51.11, lon=17.03, status="published")
    session.add(place)
    session.commit()
    session.refresh(place)

    for index in range(5):
        session.add(
            Photo(
                place_id=place.id,
                original_path=f"photos/private-{index}.jpg",
                public_path=f"/media/photos/public-{index}.jpg",
                thumb_path=f"/media/photos/thumb-{index}.jpg",
                status="approved",
                approved_at=datetime(2026, 1, index + 1, tzinfo=UTC),
            )
        )
    for index in range(3):
        session.add(
            Memory(
                place_id=place.id,
                caption=f"Byłem tutaj {index}",
                memory_text="Wspomnienie",
                original_path=f"memories/private-{index}.jpg",
                public_path=f"/media/memories/public-{index}.jpg",
                thumb_path=f"/media/memories/thumb-{index}.jpg",
                status="approved",
                claim_token_hash=claim_token_hash(f"secret-token-{index}"),
                approved_at=datetime(2026, 2, index + 1, tzinfo=UTC),
            )
        )
    session.commit()

    response = client.get("/api/places/map?city_id=wroclaw")

    assert response.status_code == 200
    preview_items = response.json()[0]["preview_items"]
    assert len(preview_items) == 6
    assert [item["kind"] for item in preview_items] == ["photo", "photo", "photo", "memory", "memory", "memory"]


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
        audio_original_path="photos/private-audio-original.mp3",
        audio_public_path="/media/photos/audio.mp3",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=123,
        audio_duration_seconds=1.25,
        description_blocks=[{"type": "paragraph", "text": "Opis zdjęcia do odsłuchu."}],
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
        audio_original_path="memories/private-audio-original.mp3",
        audio_public_path="/media/memories/audio.mp3",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=456,
        audio_duration_seconds=2.5,
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
        client.get("/api/places/map?city_id=wroclaw"),
        client.get(f"/api/places/{place.slug}"),
        client.get(f"/api/places/{place.id}/photos"),
        client.get(f"/api/places/{place.id}/photos/{photo.id}"),
        client.get(f"/api/places/{place.id}/memories"),
    ]

    for response in responses:
        assert response.status_code == 200
        assert_no_private_original_path(response.json())

    map_payload = responses[1].json()
    assert "description_blocks" not in map_payload[0]["cover_photo"]
    assert all("description_blocks" not in item for item in map_payload[0]["preview_items"])

    photos_payload = responses[3].json()
    assert "description_blocks" not in photos_payload[0]

    photo_detail_payload = responses[4].json()
    assert photo_detail_payload["description_blocks"] == [
        {"type": "paragraph", "text": "Opis zdjęcia do odsłuchu.", "url": None}
    ]
