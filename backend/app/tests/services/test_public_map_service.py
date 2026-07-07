from datetime import UTC, datetime

from app.models.memory import Memory
from app.models.photo import Photo
from app.services.places import approved_memories_by_place_id, approved_photos_by_place_id, list_public_map_places
from app.services.tokens import claim_token_hash
from app.tests.support import create_place


def test_public_map_service_omits_visual_less_places_and_prioritizes_cover(client_session) -> None:
    _client, session = client_session
    create_place(session, slug="no-preview", lat=51.11, lon=17.03)
    visual_place = create_place(session, slug="visual-preview", lat=51.12, lon=17.04)
    older_photo = Photo(
        place_id=visual_place.id,
        original_path="photos/older-original.jpg",
        public_path="/media/photos/older.jpg",
        thumb_path="/media/photos/older-thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    cover_photo = Photo(
        place_id=visual_place.id,
        original_path="photos/cover-original.jpg",
        public_path="/media/photos/cover.jpg",
        thumb_path="/media/photos/cover-thumb.jpg",
        status="approved",
        approved_at=datetime(2025, 1, 1, tzinfo=UTC),
    )
    session.add(older_photo)
    session.add(cover_photo)
    session.commit()
    session.refresh(cover_photo)
    visual_place.cover_photo_id = cover_photo.id
    session.add(visual_place)
    session.commit()

    map_places = list_public_map_places(session, "wroclaw")

    assert [place.slug for place in map_places] == ["visual-preview"]
    assert map_places[0].cover_photo is not None
    assert map_places[0].cover_photo.id == cover_photo.id
    assert [item.id for item in map_places[0].preview_items[:2]] == [cover_photo.id, older_photo.id]


def test_public_map_service_keeps_memory_preview_shape_separate_from_photo_preview(client_session) -> None:
    _client, session = client_session
    place = create_place(session, slug="memory-preview", lat=51.12, lon=17.04)
    memory = Memory(
        place_id=place.id,
        caption="Wspomnienie",
        memory_text="Tekst wspomnienia",
        original_path="memories/private.jpg",
        public_path="/media/memories/public.jpg",
        thumb_path="/media/memories/public-thumb.jpg",
        status="approved",
        claim_token_hash=claim_token_hash("claim-token"),
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    session.add(memory)
    session.commit()

    map_places = list_public_map_places(session, "wroclaw")

    assert [place.slug for place in map_places] == ["memory-preview"]
    assert map_places[0].cover_photo is None
    preview_item = map_places[0].preview_items[0]
    assert preview_item.kind == "memory"
    assert not hasattr(preview_item, "role")
    assert not hasattr(preview_item, "source")


def test_public_map_service_caps_loaded_preview_media_without_losing_cover(client_session) -> None:
    _client, session = client_session
    place = create_place(session, slug="dense-preview", lat=51.12, lon=17.04)
    photos: list[Photo] = []
    for index in range(8):
        number = index + 1
        photo = Photo(
            place_id=place.id,
            original_path=f"photos/photo-{number}-original.jpg",
            public_path=f"/media/photos/photo-{number}.jpg",
            thumb_path=f"/media/photos/photo-{number}-thumb.jpg",
            status="approved",
            approved_at=datetime(2026, 1, number, tzinfo=UTC),
        )
        photos.append(photo)
        session.add(photo)
    for index in range(8):
        number = index + 1
        session.add(
            Memory(
                place_id=place.id,
                caption=f"Pamiątka {number}",
                memory_text=f"Tekst pamiątki {number}",
                original_path=f"memories/memory-{number}-private.jpg",
                public_path=f"/media/memories/memory-{number}.jpg",
                thumb_path=f"/media/memories/memory-{number}-thumb.jpg",
                status="approved",
                claim_token_hash=claim_token_hash(f"claim-token-{number}"),
                approved_at=datetime(2026, 1, number, tzinfo=UTC),
            )
        )
    session.commit()
    cover_photo = photos[0]
    session.refresh(cover_photo)
    place.cover_photo_id = cover_photo.id
    session.add(place)
    session.commit()

    photos_by_place = approved_photos_by_place_id(session, [place])
    memories_by_place = approved_memories_by_place_id(session, [place.id])
    map_places = list_public_map_places(session, "wroclaw")

    assert len(photos_by_place[place.id]) == 7
    assert cover_photo.id in [photo.id for photo in photos_by_place[place.id]]
    assert len(memories_by_place[place.id]) == 6
    assert [map_place.slug for map_place in map_places] == ["dense-preview"]
    assert map_places[0].cover_photo is not None
    assert map_places[0].cover_photo.id == cover_photo.id
    assert len(map_places[0].preview_items) == 6
    assert map_places[0].preview_items[0].id == cover_photo.id
