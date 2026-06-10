from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.session import get_session
from app.main import app
from app.models.category import Category
from app.models.place import Place


def client_with_session() -> Generator[tuple[TestClient, Session], None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        def override_session() -> Generator[Session, None, None]:
            yield session

        app.dependency_overrides[get_session] = override_session
        yield TestClient(app), session
        app.dependency_overrides.clear()


def test_public_categories_only_show_active() -> None:
    for client, session in client_with_session():
        session.add(Category(id="active", label="Active", sort_order=1, status="active"))
        session.add(Category(id="archived", label="Archived", sort_order=0, status="archived"))
        session.commit()

        response = client.get("/api/categories")

        assert response.status_code == 200
        assert [category["id"] for category in response.json()] == ["active"]


def test_admin_can_create_update_and_archive_category() -> None:
    for client, session in client_with_session():
        create_response = client.post(
            "/api/admin/categories",
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
            json={"label": "Kawa", "sort_order": 1},
        )
        archive_response = client.delete("/api/admin/categories/coffee")
        list_response = client.get("/api/admin/categories")

        assert create_response.status_code == 201
        assert create_response.json()["status"] == "active"
        assert update_response.status_code == 200
        assert update_response.json()["label"] == "Kawa"
        assert archive_response.status_code == 200
        assert archive_response.json()["status"] == "archived"
        assert list_response.status_code == 200
        assert list_response.json()[0]["id"] == "coffee"
        assert session.get(Category, "coffee") is not None


def test_admin_can_permanently_delete_unused_category() -> None:
    for client, session in client_with_session():
        session.add(Category(id="unused", label="Unused"))
        session.commit()

        response = client.delete("/api/admin/categories/unused?force=true")

        assert response.status_code == 204
        assert session.get(Category, "unused") is None


def test_admin_cannot_permanently_delete_used_category() -> None:
    for client, session in client_with_session():
        category = Category(id="used", label="Used")
        session.add(category)
        session.add(Place(slug="place", title="Place", lat=51.1, lon=17.1, category_id=category.id))
        session.commit()

        response = client.delete("/api/admin/categories/used?force=true")

        assert response.status_code == 409
        assert session.get(Category, "used") is not None


def test_admin_place_requires_active_category_on_assignment() -> None:
    for client, session in client_with_session():
        session.add(Category(id="active", label="Active", status="active"))
        session.add(Category(id="archived", label="Archived", status="archived"))
        session.commit()

        active_response = client.post(
            "/api/admin/places",
            json={"slug": "active-place", "title": "Active", "lat": 51.1, "lon": 17.1, "category_id": "active"},
        )
        archived_response = client.post(
            "/api/admin/places",
            json={"slug": "archived-place", "title": "Archived", "lat": 51.2, "lon": 17.2, "category_id": "archived"},
        )

        assert active_response.status_code == 201
        assert archived_response.status_code == 422
