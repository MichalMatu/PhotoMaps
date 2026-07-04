import pytest
from fastapi import HTTPException

from app.models.category import Category
from app.models.guide import Guide
from app.models.photo import Photo
from app.models.place import PlaceCategory
from app.schemas.category import CategoryCreate
from app.schemas.guide import GuideCreate, GuidePlaceCreate
from app.schemas.place import PlaceUpdate
from app.services.categories import create_admin_category, delete_admin_category
from app.services.guides import add_admin_place_to_guide, create_admin_guide
from app.services.places import update_admin_place
from app.tests.support import create_place


def test_admin_category_service_archives_and_blocks_used_force_delete(client_session) -> None:
    _client, session = client_session
    category = create_admin_category(session, CategoryCreate(id="details", label="Details"))

    archived = delete_admin_category(session, category.id, force=False)

    assert archived is not None
    assert archived.status == "archived"

    used_category = Category(id="used", label="Used")
    place = create_place(session, slug="used-category-place")
    session.add(used_category)
    session.commit()
    session.add(PlaceCategory(place_id=place.id, category_id=used_category.id))
    session.commit()

    with pytest.raises(HTTPException) as exc_info:
        delete_admin_category(session, used_category.id, force=True)

    assert exc_info.value.status_code == 409


def test_admin_place_service_validates_cover_photo_ownership_and_status(client_session) -> None:
    _client, session = client_session
    place = create_place(session, slug="cover-owner")
    other_place = create_place(session, slug="cover-other", lat=51.12, lon=17.04)
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
    session.add(pending_photo)
    session.add(other_photo)
    session.commit()
    session.refresh(pending_photo)
    session.refresh(other_photo)

    with pytest.raises(HTTPException) as pending_exc:
        update_admin_place(session, place.id, PlaceUpdate(cover_photo_id=pending_photo.id))
    with pytest.raises(HTTPException) as owner_exc:
        update_admin_place(session, place.id, PlaceUpdate(cover_photo_id=other_photo.id))

    assert pending_exc.value.status_code == 422
    assert owner_exc.value.status_code == 422


def test_admin_guide_service_rejects_unpublished_place_assignment(client_session) -> None:
    _client, session = client_session
    guide = create_admin_guide(session, GuideCreate(slug="service-guide", title="Service guide"))
    draft_place = create_place(session, slug="draft-service-place", status="draft")

    with pytest.raises(HTTPException) as exc_info:
        add_admin_place_to_guide(session, guide.id, GuidePlaceCreate(place_id=draft_place.id, sort_order=0))

    assert exc_info.value.status_code == 409
    assert session.get(Guide, guide.id) is not None
