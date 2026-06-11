from conftest import ADMIN_HEADERS

from app.models.city import City


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
