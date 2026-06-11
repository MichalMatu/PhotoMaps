from conftest import ADMIN_HEADERS, create_place

from app.models.place import Place


def test_public_guides_only_show_published_with_published_places(client_session) -> None:
    client, session = client_session
    public_place = create_place(session)
    draft_place = create_place(session, lat=51.12, lon=17.04, slug="draft-place", status="draft", title="Draft")

    create_response = client.post(
        "/api/admin/guides",
        headers=ADMIN_HEADERS,
        json={"slug": "weekend", "title": "Weekend", "description": "Plan", "status": "published"},
    )
    guide_id = create_response.json()["id"]
    client.post(
        f"/api/admin/guides/{guide_id}/places",
        headers=ADMIN_HEADERS,
        json={"place_id": public_place.id, "sort_order": 2},
    )
    client.post(
        f"/api/admin/guides/{guide_id}/places",
        headers=ADMIN_HEADERS,
        json={"place_id": draft_place.id, "sort_order": 1},
    )

    list_response = client.get("/api/guides")
    detail_response = client.get("/api/guides/weekend")

    assert list_response.status_code == 200
    assert [guide["slug"] for guide in list_response.json()] == ["weekend"]
    assert detail_response.status_code == 200
    assert [place["slug"] for place in detail_response.json()["places"]] == ["public-place"]


def test_admin_can_remove_place_from_guide(client_session) -> None:
    client, session = client_session
    place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
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
