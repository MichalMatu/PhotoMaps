import json
from datetime import UTC, datetime

from app.models.photo import Photo
from app.models.place import Place
from app.services.frontend_seo import noindex_metadata, place_metadata


def test_place_seo_metadata_uses_public_cover_without_private_paths(client_session) -> None:
    _client, session = client_session
    place = Place(
        city_id="wroclaw",
        slug="rynek-wroclaw",
        title="Rynek Wrocław",
        description="Centralny plac miasta z galerią zdjęć, pamiątkami i opowieściami.",
        lat=51.11,
        lon=17.03,
        status="published",
    )
    session.add(place)
    session.commit()
    session.refresh(place)
    photo = Photo(
        place_id=place.id,
        original_path="photos/private/rynek-original.jpg",
        public_path="/media/photos/rynek.jpg",
        thumb_path="/media/photos/rynek-thumb.jpg",
        status="approved",
        caption="Rynek Wrocław",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    place.cover_photo_id = photo.id
    session.add(place)
    session.commit()

    metadata = place_metadata("https://photomap.pl", session, "rynek-wroclaw")

    assert metadata is not None
    assert metadata.title == "Rynek Wrocław | PhotoMap"
    assert metadata.canonical_url == "https://photomap.pl/places/rynek-wroclaw"
    assert metadata.image_url == "https://photomap.pl/media/photos/rynek.jpg"
    serialized = json.dumps(metadata.structured_data, ensure_ascii=False)
    assert "photos/private" not in serialized
    assert "/media/photos/rynek.jpg" in serialized


def test_unknown_frontend_route_metadata_is_not_indexable() -> None:
    metadata = noindex_metadata("https://photomap.pl", "/unknown")

    assert metadata.canonical_url == "https://photomap.pl/unknown"
    assert metadata.robots == "noindex,follow"
