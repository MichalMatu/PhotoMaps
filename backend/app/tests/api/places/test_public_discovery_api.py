from datetime import UTC, datetime

from app.models.category import Category
from app.models.city import City
from app.models.guide import Guide, PlaceGuide
from app.models.photo import Photo
from app.models.place import Place, PlaceCategory


def assert_no_private_or_admin_fields(payload) -> None:
    if isinstance(payload, dict):
        assert "audio_original_path" not in payload
        assert "local_comment" not in payload
        assert "original_path" not in payload
        for value in payload.values():
            assert_no_private_or_admin_fields(value)
    elif isinstance(payload, list):
        for item in payload:
            assert_no_private_or_admin_fields(item)


def add_photo(
    session,
    place: Place,
    suffix: str,
    *,
    status: str = "approved",
    as_cover: bool = False,
) -> Photo:
    photo = Photo(
        place_id=place.id,
        original_path=f"photos/private/{suffix}.jpg",
        public_path=f"/media/photos/{suffix}.jpg",
        thumb_path=f"/media/photos/{suffix}-thumb.jpg",
        status=status,
        caption=f"{suffix} caption",
        description_blocks=[{"type": "paragraph", "text": f"{suffix} description"}],
        attribution_author="Photo author",
        attribution_source_url="https://example.com/source",
        attribution_license="CC BY",
        attribution_license_url="https://creativecommons.org/licenses/by/4.0/",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC) if status == "approved" else None,
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    if as_cover:
        place.cover_photo_id = photo.id
        session.add(place)
        session.commit()
        session.refresh(place)
    return photo


def test_public_discovery_lists_active_cities_and_city_places(client_session) -> None:
    client, session = client_session
    category = Category(id="market", label="Rynek", sort_order=1)
    public_place = Place(
        city_id="wroclaw",
        slug="rynek",
        title="Rynek",
        description="Centralny plac Wrocławia.",
        local_comment="Not public",
        lat=51.11,
        lon=17.03,
        status="published",
    )
    draft_place = Place(city_id="wroclaw", slug="draft", title="Draft", lat=51.12, lon=17.04, status="draft")
    session.add(City(id="poznan", name="Poznań", lat=52.4, lon=16.9, status="archived"))
    session.add(category)
    session.add(public_place)
    session.add(draft_place)
    session.commit()
    session.refresh(public_place)
    session.add(PlaceCategory(place_id=public_place.id, category_id=category.id, sort_order=0))
    session.commit()

    cities_response = client.get("/api/public/cities")
    places_response = client.get("/api/public/cities/wroclaw/places")
    missing_city_response = client.get("/api/public/cities/poznan/places")

    assert cities_response.status_code == 200
    assert [city["id"] for city in cities_response.json()] == ["wroclaw"]
    assert places_response.status_code == 200
    body = places_response.json()
    assert [place["slug"] for place in body] == ["rynek"]
    assert body[0]["city"]["id"] == "wroclaw"
    assert body[0]["categories"][0]["id"] == "market"
    assert body[0]["page_path"] == "/places/rynek"
    assert body[0]["api_path"] == "/api/public/cities/wroclaw/places/rynek"
    assert "status" not in body[0]
    assert_no_private_or_admin_fields(body)
    assert missing_city_response.status_code == 404


def test_public_discovery_place_detail_returns_descriptions_and_approved_photos(client_session) -> None:
    client, session = client_session
    place = Place(
        city_id="wroclaw",
        slug="rynek",
        title="Rynek",
        description="Centralny plac Wrocławia.",
        local_comment="Internal research note",
        lat=51.11,
        lon=17.03,
        status="published",
        article_blocks=[
            {"type": "heading", "text": "Serce miasta"},
            {"type": "paragraph", "text": "Opis dostępny dla agentów i crawlerów."},
        ],
    )
    session.add(place)
    session.commit()
    session.refresh(place)
    cover_photo = add_photo(session, place, "cover", as_cover=True)
    add_photo(session, place, "pending", status="pending")

    response = client.get("/api/public/cities/wroclaw/places/rynek")
    wrong_city_response = client.get("/api/public/cities/missing/places/rynek")

    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "rynek"
    assert body["description"] == "Centralny plac Wrocławia."
    assert body["article_blocks"] == [
        {"type": "heading", "text": "Serce miasta", "url": None},
        {"type": "paragraph", "text": "Opis dostępny dla agentów i crawlerów.", "url": None},
    ]
    assert [photo["id"] for photo in body["photos"]] == [cover_photo.id]
    assert body["cover_photo"]["id"] == cover_photo.id
    assert body["photos"][0]["description_blocks"] == [{"type": "paragraph", "text": "cover description", "url": None}]
    assert "status" not in body
    assert_no_private_or_admin_fields(body)
    assert wrong_city_response.status_code == 404


def test_llms_robots_and_sitemap_expose_public_discovery_links(client_session) -> None:
    client, session = client_session
    place = Place(
        city_id="wroclaw",
        slug="sitemap-place",
        title="Sitemap place",
        lat=51.11,
        lon=17.03,
        status="published",
    )
    draft_place = Place(city_id="wroclaw", slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft")
    session.add(place)
    session.add(draft_place)
    session.commit()
    session.refresh(place)
    guide = Guide(slug="weekend-we-wroclawiu", title="Weekend we Wrocławiu", status="published")
    draft_guide = Guide(slug="draft-guide", title="Draft guide", status="draft")
    session.add(guide)
    session.add(draft_guide)
    session.commit()
    session.refresh(guide)
    session.add(PlaceGuide(guide_id=guide.id, place_id=place.id, sort_order=0))
    session.commit()

    discovery_response = client.get("/api/public")
    llms_response = client.get("/llms.txt")
    robots_response = client.get("/robots.txt")
    sitemap_response = client.get("/sitemap.xml")

    assert discovery_response.status_code == 200
    assert discovery_response.json()["place_detail_path_template"] == "/api/public/cities/{city_id}/places/{place_slug}"
    assert llms_response.status_code == 200
    assert "/api/public/cities/wroclaw/places" in llms_response.text
    assert "visual map of places in Poland with photos" in llms_response.text
    assert "przewodnik po miejscach w Polsce ze zdjęciami" in llms_response.text
    assert "Private" not in llms_response.text
    assert robots_response.status_code == 200
    assert "Sitemap: http://testserver/sitemap.xml" in robots_response.text
    assert "User-agent: OAI-SearchBot" in robots_response.text
    assert "User-agent: PerplexityBot" in robots_response.text
    assert sitemap_response.status_code == 200
    assert sitemap_response.headers["content-type"].startswith("application/xml")
    assert "<loc>http://testserver/places/sitemap-place</loc>" in sitemap_response.text
    assert "<loc>http://testserver/guides/weekend-we-wroclawiu</loc>" in sitemap_response.text
    assert "draft-place" not in sitemap_response.text
    assert "draft-guide" not in sitemap_response.text


def test_public_discovery_supports_head_for_crawler_diagnostics(client_session) -> None:
    client, session = client_session
    place = Place(
        city_id="wroclaw",
        slug="head-place",
        title="Head place",
        lat=51.11,
        lon=17.03,
        status="published",
    )
    session.add(place)
    session.commit()

    assert client.head("/api/public").status_code == 200
    assert client.head("/api/public/cities").status_code == 200
    assert client.head("/api/public/cities/wroclaw/places").status_code == 200
    assert client.head("/api/public/cities/wroclaw/places/head-place").status_code == 200
    assert client.head("/llms.txt").status_code == 200
    assert client.head("/robots.txt").status_code == 200
    assert client.head("/sitemap.xml").status_code == 200
    assert client.head("/api/public/cities/missing/places").status_code == 404
