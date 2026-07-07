from datetime import UTC, datetime

from fastapi import HTTPException
from pytest import raises

from app.models.photo import Photo
from app.schemas.photo import PhotoUpdate
from app.services.admin_photos import (
    delete_admin_photo,
    review_admin_photo,
    set_admin_cover_photo,
    update_admin_photo,
)
from app.tests.support import create_place


def photo_for_place(place_id: str, **overrides) -> Photo:
    data = {
        "place_id": place_id,
        "original_path": f"photos/{place_id}/original.jpg",
        "public_path": f"/media/photos/{place_id}/public.jpg",
        "thumb_path": f"/media/photos/{place_id}/thumb.jpg",
        "status": "pending",
    }
    data.update(overrides)
    return Photo(**data)


def test_admin_photo_service_review_approves_and_sets_cover(client_session) -> None:
    _client, session = client_session
    place = create_place(session)
    photo = photo_for_place(place.id)
    session.add(photo)
    session.commit()
    session.refresh(photo)

    reviewed_photo = review_admin_photo(session, photo.id, "approved")
    session.refresh(place)

    assert reviewed_photo.status == "approved"
    assert reviewed_photo.approved_at is not None
    assert place.photo_count == 1
    assert place.cover_photo_id == photo.id


def test_admin_photo_service_update_normalizes_content_fields(client_session) -> None:
    _client, session = client_session
    place = create_place(session)
    photo = photo_for_place(
        place.id,
        attribution_author="Stary autor",
        attribution_license="CC BY 4.0",
        attribution_license_url="https://creativecommons.org/licenses/by/4.0/",
        attribution_source_url="https://example.com/old",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    updated_photo = update_admin_photo(
        session,
        photo.id,
        PhotoUpdate(
            attribution_author="  Marta  ",
            attribution_source_url="  https://example.com/photo  ",
            caption="  Nowy podpis  ",
            description_blocks=[{"type": "paragraph", "text": "  Opis zdjęcia.  "}],
        ),
    )

    assert updated_photo.caption == "Nowy podpis"
    assert updated_photo.description_blocks == [{"type": "paragraph", "text": "Opis zdjęcia."}]
    assert updated_photo.attribution_author == "Marta"
    assert updated_photo.attribution_source_url == "https://example.com/photo"
    assert updated_photo.attribution_license == "CC BY 4.0"
    assert updated_photo.attribution_license_url == "https://creativecommons.org/licenses/by/4.0/"


def test_admin_photo_service_cover_requires_approved_photo(client_session) -> None:
    _client, session = client_session
    place = create_place(session)
    photo = photo_for_place(place.id, status="pending")
    session.add(photo)
    session.commit()
    session.refresh(photo)

    with raises(HTTPException) as exc_info:
        set_admin_cover_photo(session, photo.id)

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "Only approved photos can be used as cover"


def test_admin_photo_service_delete_updates_place_and_selects_replacement_cover(client_session) -> None:
    _client, session = client_session
    place = create_place(session)
    cover_photo = photo_for_place(
        place.id,
        original_path="photos/place/cover-original.jpg",
        public_path="/media/photos/place/cover.jpg",
        thumb_path="/media/photos/place/cover-thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    replacement_photo = photo_for_place(
        place.id,
        original_path="photos/place/replacement-original.jpg",
        public_path="/media/photos/place/replacement.jpg",
        thumb_path="/media/photos/place/replacement-thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    session.add(cover_photo)
    session.add(replacement_photo)
    session.commit()
    session.refresh(cover_photo)
    session.refresh(replacement_photo)
    place.photo_count = 2
    place.cover_photo_id = cover_photo.id
    session.add(place)
    session.commit()

    delete_admin_photo(session, cover_photo.id)
    session.refresh(place)

    assert session.get(Photo, cover_photo.id) is None
    assert session.get(Photo, replacement_photo.id) is not None
    assert place.photo_count == 1
    assert place.cover_photo_id == replacement_photo.id
