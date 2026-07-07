from app.models.city import City
from app.models.place import Place
from app.tests.support import ADMIN_HEADERS


def test_public_cities_only_show_active(client_session) -> None:
    client, session = client_session
    session.add(City(id="krakow", name="Kraków", lat=50.0614, lon=19.9366, status="archived", sort_order=20))
    session.commit()

    response = client.get("/api/cities")

    assert response.status_code == 200
    assert [city["id"] for city in response.json()] == ["wroclaw"]


def test_admin_cities_requires_token(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/cities")

    assert response.status_code == 401


def test_admin_cities_lists_all_cities(client_session) -> None:
    client, session = client_session
    session.add(City(id="krakow", name="Kraków", lat=50.0614, lon=19.9366, status="archived", sort_order=20))
    session.commit()

    response = client.get("/api/admin/cities", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert [city["id"] for city in response.json()] == ["wroclaw", "krakow"]


def test_admin_can_create_city(client_session) -> None:
    client, _session = client_session

    response = client.post(
        "/api/admin/cities",
        headers=ADMIN_HEADERS,
        json={
            "id": "krakow",
            "name": "Kraków",
            "region": "Małopolskie",
            "lat": 50.0614,
            "lon": 19.9366,
            "default_zoom": 13,
            "sort_order": 20,
            "status": "active",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": "krakow",
        "name": "Kraków",
        "region": "Małopolskie",
        "lat": 50.0614,
        "lon": 19.9366,
        "default_zoom": 13,
        "sort_order": 20,
        "status": "active",
    }

    list_response = client.get("/api/admin/cities", headers=ADMIN_HEADERS)

    assert [city["id"] for city in list_response.json()] == ["wroclaw", "krakow"]


def test_admin_create_city_rejects_duplicate_id(client_session) -> None:
    client, _session = client_session

    response = client.post(
        "/api/admin/cities",
        headers=ADMIN_HEADERS,
        json={
            "id": "wroclaw",
            "name": "Wrocław 2",
            "region": "Dolnośląskie",
            "lat": 51.1079,
            "lon": 17.0385,
            "default_zoom": 13,
            "sort_order": 10,
            "status": "active",
        },
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "City already exists"


def test_admin_can_update_city(client_session) -> None:
    client, session = client_session
    session.add(City(id="krakow", name="Kraków", lat=50.0614, lon=19.9366, status="active", sort_order=20))
    session.commit()

    response = client.patch(
        "/api/admin/cities/krakow",
        headers=ADMIN_HEADERS,
        json={
            "name": "Kraków centrum",
            "region": "Małopolskie",
            "lat": 50.0615,
            "lon": 19.9367,
            "default_zoom": 14,
            "sort_order": 30,
            "status": "archived",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": "krakow",
        "name": "Kraków centrum",
        "region": "Małopolskie",
        "lat": 50.0615,
        "lon": 19.9367,
        "default_zoom": 14,
        "sort_order": 30,
        "status": "archived",
    }


def test_admin_can_archive_city(client_session) -> None:
    client, session = client_session
    session.add(City(id="krakow", name="Kraków", lat=50.0614, lon=19.9366, status="active", sort_order=20))
    session.commit()

    response = client.delete("/api/admin/cities/krakow", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.json()["status"] == "archived"


def test_admin_can_delete_unused_city_permanently(client_session) -> None:
    client, session = client_session
    session.add(City(id="krakow", name="Kraków", lat=50.0614, lon=19.9366, status="archived", sort_order=20))
    session.commit()

    response = client.delete("/api/admin/cities/krakow?force=true", headers=ADMIN_HEADERS)

    assert response.status_code == 204
    assert session.get(City, "krakow") is None


def test_admin_permanent_city_delete_rejects_city_with_places(client_session) -> None:
    client, session = client_session
    session.add(City(id="krakow", name="Kraków", lat=50.0614, lon=19.9366, status="archived", sort_order=20))
    session.add(
        Place(
            id="place-krakow",
            city_id="krakow",
            slug="place-krakow",
            title="Miejsce w Krakowie",
            description=None,
            local_comment=None,
            lat=50.0614,
            lon=19.9366,
            weight=1.0,
            status="published",
        )
    )
    session.commit()

    response = client.delete("/api/admin/cities/krakow?force=true", headers=ADMIN_HEADERS)

    assert response.status_code == 409
    assert response.json()["detail"] == "City is used by places"
