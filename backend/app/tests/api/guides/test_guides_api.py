from sqlmodel import select

from app.models.guide import Guide, PlaceGuide
from app.models.photo import Photo
from app.models.place import Place
from app.models.report import Report
from app.tests.support import ADMIN_HEADERS, create_place


def test_public_guides_only_show_published_with_published_places(client_session) -> None:
    client, session = client_session
    public_place = create_place(session)
    draft_place = create_place(session, lat=51.12, lon=17.04, slug="draft-place", status="draft", title="Draft")
    cover_photo = Photo(
        place_id=public_place.id,
        original_path="photos/private-original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/public-thumb.jpg",
        status="approved",
        caption="Public cover",
    )
    pending_photo = Photo(
        place_id=draft_place.id,
        original_path="photos/draft-private-original.jpg",
        public_path="/media/photos/draft.jpg",
        thumb_path="/media/photos/draft-thumb.jpg",
        status="pending",
        caption="Draft private",
    )
    session.add(cover_photo)
    session.add(pending_photo)
    session.commit()
    session.refresh(cover_photo)
    public_place.cover_photo_id = cover_photo.id
    public_place.photo_count = 1
    session.add(public_place)
    session.commit()

    create_response = client.post(
        "/api/admin/guides",
        headers=ADMIN_HEADERS,
        json={
            "slug": "weekend",
            "title": "Weekend",
            "description": "Plan",
            "route_points": [{"lat": 51.11, "lon": 17.03}, {"lat": 51.12, "lon": 17.04}],
            "status": "published",
        },
    )
    guide_id = create_response.json()["id"]
    add_public_response = client.post(
        f"/api/admin/guides/{guide_id}/places",
        headers=ADMIN_HEADERS,
        json={"place_id": public_place.id, "sort_order": 2},
    )
    add_draft_response = client.post(
        f"/api/admin/guides/{guide_id}/places",
        headers=ADMIN_HEADERS,
        json={"place_id": draft_place.id, "sort_order": 1},
    )

    list_response = client.get("/api/guides")
    detail_response = client.get("/api/guides/weekend")

    assert add_public_response.status_code == 200
    assert add_draft_response.status_code == 409
    assert list_response.status_code == 200
    assert [guide["slug"] for guide in list_response.json()] == ["weekend"]
    listed_guide = list_response.json()[0]
    assert "status" not in listed_guide
    assert "created_at" not in listed_guide
    assert "updated_at" not in listed_guide
    assert listed_guide["place_count"] == 1
    assert listed_guide["route_points"] == [{"lat": 51.11, "lon": 17.03}, {"lat": 51.12, "lon": 17.04}]
    assert listed_guide["cover_photo"]["id"] == cover_photo.id
    assert listed_guide["preview_places"][0]["slug"] == "public-place"
    assert listed_guide["preview_places"][0]["city_id"] == public_place.city_id
    assert listed_guide["preview_places"][0]["lat"] == public_place.lat
    assert listed_guide["preview_places"][0]["lon"] == public_place.lon
    assert listed_guide["preview_places"][0]["cover_photo"]["thumb_path"] == "/media/photos/public-thumb.jpg"
    assert "local_comment" not in listed_guide["preview_places"][0]
    assert "status" not in listed_guide["preview_places"][0]
    assert "original_path" not in listed_guide["cover_photo"]
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["route_points"] == [{"lat": 51.11, "lon": 17.03}, {"lat": 51.12, "lon": 17.04}]
    assert [place["slug"] for place in detail_payload["places"]] == ["public-place"]
    assert detail_payload["places"][0]["cover_photo"]["public_path"] == "/media/photos/public.jpg"
    assert "local_comment" not in detail_payload["places"][0]
    assert "status" not in detail_payload["places"][0]
    assert "draft-place" not in [place["slug"] for place in detail_payload["preview_places"]]


def test_admin_can_remove_place_from_guide(client_session) -> None:
    client, session = client_session
    place = Place(city_id="wroclaw", slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
    session.add(place)
    session.commit()
    session.refresh(place)
    create_response = client.post(
        "/api/admin/guides",
        headers=ADMIN_HEADERS,
        json={"slug": "weekend", "title": "Weekend", "status": "draft"},
    )
    guide_id = create_response.json()["id"]
    client.post(
        f"/api/admin/guides/{guide_id}/places",
        headers=ADMIN_HEADERS,
        json={"place_id": place.id, "sort_order": 1},
    )

    response = client.delete(f"/api/admin/guides/{guide_id}/places/{place.id}", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.json()["places"] == []


def test_admin_can_reorder_guide_places_in_single_request(client_session) -> None:
    client, session = client_session
    first_place = create_place(session, slug="first-place", title="First")
    second_place = create_place(session, slug="second-place", title="Second", lat=51.12)
    third_place = create_place(session, slug="third-place", title="Third", lat=51.13)
    create_response = client.post(
        "/api/admin/guides",
        headers=ADMIN_HEADERS,
        json={"slug": "weekend", "title": "Weekend", "status": "draft"},
    )
    guide_id = create_response.json()["id"]
    for index, place in enumerate([first_place, second_place, third_place]):
        add_response = client.post(
            f"/api/admin/guides/{guide_id}/places",
            headers=ADMIN_HEADERS,
            json={"place_id": place.id, "sort_order": index},
        )
        assert add_response.status_code == 200

    response = client.put(
        f"/api/admin/guides/{guide_id}/places/order",
        headers=ADMIN_HEADERS,
        json={
            "places": [
                {"place_id": third_place.id, "sort_order": 0},
                {"place_id": first_place.id, "sort_order": 1},
                {"place_id": second_place.id, "sort_order": 2},
            ],
        },
    )

    assert response.status_code == 200
    assert [place["id"] for place in response.json()["places"]] == [third_place.id, first_place.id, second_place.id]
    assert session.get(PlaceGuide, (guide_id, third_place.id)).sort_order == 0
    assert session.get(PlaceGuide, (guide_id, first_place.id)).sort_order == 1
    assert session.get(PlaceGuide, (guide_id, second_place.id)).sort_order == 2


def test_admin_reorder_guide_places_rejects_duplicate_places(client_session) -> None:
    client, session = client_session
    first_place = create_place(session, slug="first-place", title="First")
    second_place = create_place(session, slug="second-place", title="Second", lat=51.12)
    guide = Guide(slug="weekend", title="Weekend", status="draft")
    session.add(guide)
    session.commit()
    session.refresh(guide)
    session.add(PlaceGuide(guide_id=guide.id, place_id=first_place.id, sort_order=0))
    session.add(PlaceGuide(guide_id=guide.id, place_id=second_place.id, sort_order=1))
    session.commit()

    response = client.put(
        f"/api/admin/guides/{guide.id}/places/order",
        headers=ADMIN_HEADERS,
        json={
            "places": [
                {"place_id": first_place.id, "sort_order": 0},
                {"place_id": first_place.id, "sort_order": 1},
            ],
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Guide place order cannot contain duplicate places"


def test_admin_reorder_guide_places_rejects_duplicate_sort_orders(client_session) -> None:
    client, session = client_session
    first_place = create_place(session, slug="first-place", title="First")
    second_place = create_place(session, slug="second-place", title="Second", lat=51.12)
    guide = Guide(slug="weekend", title="Weekend", status="draft")
    session.add(guide)
    session.commit()
    session.refresh(guide)
    session.add(PlaceGuide(guide_id=guide.id, place_id=first_place.id, sort_order=0))
    session.add(PlaceGuide(guide_id=guide.id, place_id=second_place.id, sort_order=1))
    session.commit()

    response = client.put(
        f"/api/admin/guides/{guide.id}/places/order",
        headers=ADMIN_HEADERS,
        json={
            "places": [
                {"place_id": first_place.id, "sort_order": 0},
                {"place_id": second_place.id, "sort_order": 0},
            ],
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Guide place order cannot contain duplicate sort orders"


def test_admin_reorder_guide_places_requires_current_guide_places(client_session) -> None:
    client, session = client_session
    first_place = create_place(session, slug="first-place", title="First")
    second_place = create_place(session, slug="second-place", title="Second", lat=51.12)
    foreign_place = create_place(session, slug="foreign-place", title="Foreign", lat=51.13)
    guide = Guide(slug="weekend", title="Weekend", status="draft")
    session.add(guide)
    session.commit()
    session.refresh(guide)
    session.add(PlaceGuide(guide_id=guide.id, place_id=first_place.id, sort_order=0))
    session.add(PlaceGuide(guide_id=guide.id, place_id=second_place.id, sort_order=1))
    session.commit()

    response = client.put(
        f"/api/admin/guides/{guide.id}/places/order",
        headers=ADMIN_HEADERS,
        json={
            "places": [
                {"place_id": first_place.id, "sort_order": 0},
                {"place_id": foreign_place.id, "sort_order": 1},
            ],
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Guide place order must include exactly current guide places"


def test_admin_cannot_publish_guide_with_draft_place_assignment(client_session) -> None:
    client, session = client_session
    draft_place = create_place(session, slug="draft-place", status="draft", title="Draft")
    guide = Guide(slug="draft-route", title="Draft route", status="draft")
    session.add(guide)
    session.commit()
    session.refresh(guide)
    session.add(PlaceGuide(guide_id=guide.id, place_id=draft_place.id))
    session.commit()

    response = client.patch(
        f"/api/admin/guides/{guide.id}",
        headers=ADMIN_HEADERS,
        json={"status": "published"},
    )

    assert response.status_code == 409


def test_admin_can_delete_guide_with_assignments_and_reports(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    guide = Guide(slug="delete-guide", title="Delete guide", status="published")
    session.add(guide)
    session.commit()
    session.refresh(guide)
    session.add(PlaceGuide(guide_id=guide.id, place_id=place.id))
    session.add(Report(target_type="guide", target_id=guide.id, reason="wrong_data"))
    session.commit()

    response = client.delete(f"/api/admin/guides/{guide.id}", headers=ADMIN_HEADERS)
    list_response = client.get("/api/admin/guides", headers=ADMIN_HEADERS)
    public_response = client.get("/api/guides/delete-guide")

    assert response.status_code == 204
    assert list_response.status_code == 200
    assert list_response.json() == []
    assert public_response.status_code == 404
    assert session.get(Guide, guide.id) is None
    assert session.get(PlaceGuide, (guide.id, place.id)) is None
    assert (
        session.exec(select(Report).where(Report.target_type == "guide").where(Report.target_id == guide.id)).all()
        == []
    )
