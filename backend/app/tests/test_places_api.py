from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.init_db import seed_categories
from app.db.session import get_session
from app.main import app
from app.models.place import Place


def client_with_session() -> Generator[tuple[TestClient, Session], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        seed_categories(session)

        def override_session() -> Generator[Session, None, None]:
            yield session

        app.dependency_overrides[get_session] = override_session
        yield TestClient(app), session
        app.dependency_overrides.clear()


def test_public_places_only_show_published_non_chain() -> None:
    for client, session in client_with_session():
        session.add(Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published"))
        session.add(Place(slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
        session.add(Place(slug="chain-place", title="Chain", lat=51.13, lon=17.05, status="published", is_chain=True))
        session.commit()

        response = client.get("/api/places")

        assert response.status_code == 200
        assert [place["slug"] for place in response.json()] == ["public-place"]


def test_public_place_detail_hides_draft_and_archived() -> None:
    for client, session in client_with_session():
        session.add(Place(slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
        session.add(Place(slug="old-place", title="Old", lat=51.13, lon=17.05, status="archived"))
        session.commit()

        assert client.get("/api/places/draft-place").status_code == 404
        assert client.get("/api/places/old-place").status_code == 404


def test_admin_can_list_and_archive_places() -> None:
    for client, session in client_with_session():
        place = Place(slug="admin-place", title="Admin", lat=51.12, lon=17.04, status="draft")
        session.add(place)
        session.commit()
        session.refresh(place)

        list_response = client.get("/api/admin/places")
        archive_response = client.delete(f"/api/admin/places/{place.id}")

        assert list_response.status_code == 200
        assert list_response.json()[0]["slug"] == "admin-place"
        assert archive_response.status_code == 200
        assert archive_response.json()["status"] == "archived"
        assert session.get(Place, place.id) is not None
