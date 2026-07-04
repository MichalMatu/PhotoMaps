from app.models.category import Category
from app.models.place import Place, PlaceCategory
from app.tests.support import ADMIN_HEADERS


def test_public_categories_only_show_active(client_session) -> None:
    client, session = client_session
    session.add(Category(id="active", label="Active", sort_order=1, status="active"))
    session.add(Category(id="archived", label="Archived", sort_order=0, status="archived"))
    session.commit()

    response = client.get("/api/categories")

    assert response.status_code == 200
    assert [category["id"] for category in response.json()] == ["active"]


def test_admin_requires_token(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/categories")

    assert response.status_code == 401


def test_admin_can_create_update_and_archive_category(client_session) -> None:
    client, session = client_session

    create_response = client.post(
        "/api/admin/categories",
        headers=ADMIN_HEADERS,
        json={
            "id": "coffee",
            "label": "Coffee",
            "description": "Good stops",
            "icon": "coffee",
            "sort_order": 3,
        },
    )
    update_response = client.patch(
        "/api/admin/categories/coffee",
        headers=ADMIN_HEADERS,
        json={"label": "Kawa", "sort_order": 1},
    )
    archive_response = client.delete("/api/admin/categories/coffee", headers=ADMIN_HEADERS)
    list_response = client.get("/api/admin/categories", headers=ADMIN_HEADERS)

    assert create_response.status_code == 201
    assert create_response.json()["status"] == "active"
    assert update_response.status_code == 200
    assert update_response.json()["label"] == "Kawa"
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"
    assert list_response.status_code == 200
    assert list_response.json()[0]["id"] == "coffee"
    assert session.get(Category, "coffee") is not None


def test_admin_can_permanently_delete_unused_category(client_session) -> None:
    client, session = client_session
    session.add(Category(id="unused", label="Unused"))
    session.commit()

    response = client.delete("/api/admin/categories/unused?force=true", headers=ADMIN_HEADERS)

    assert response.status_code == 204
    assert session.get(Category, "unused") is None


def test_admin_cannot_permanently_delete_used_category(client_session) -> None:
    client, session = client_session
    category = Category(id="used", label="Used")
    session.add(category)
    place = Place(city_id="wroclaw", slug="place", title="Place", lat=51.1, lon=17.1)
    session.add(place)
    session.commit()
    session.refresh(place)
    session.add(PlaceCategory(place_id=place.id, category_id=category.id))
    session.commit()

    response = client.delete("/api/admin/categories/used?force=true", headers=ADMIN_HEADERS)

    assert response.status_code == 409
    assert session.get(Category, "used") is not None


def test_admin_place_requires_active_category_on_assignment(client_session) -> None:
    client, session = client_session
    session.add(Category(id="active", label="Active", status="active"))
    session.add(Category(id="hidden", label="Hidden", status="active"))
    session.add(Category(id="archived", label="Archived", status="archived"))
    session.commit()

    active_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "active-place",
            "title": "Active",
            "lat": 51.1,
            "lon": 17.1,
            "category_ids": ["active", "hidden"],
        },
    )
    archived_response = client.post(
        "/api/admin/places",
        headers=ADMIN_HEADERS,
        json={
            "city_id": "wroclaw",
            "slug": "archived-place",
            "title": "Archived",
            "lat": 51.2,
            "lon": 17.2,
            "category_ids": ["archived"],
        },
    )

    assert active_response.status_code == 201
    assert active_response.json()["category_ids"] == ["active", "hidden"]
    assert archived_response.status_code == 422
