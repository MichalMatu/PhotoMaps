from collections.abc import Generator

from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.session import get_session
from app.main import app
from app.models.place import Place

ADMIN_TOKEN = "test-admin-token"
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}


def client_with_session(monkeypatch: MonkeyPatch) -> Generator[tuple[TestClient, Session], None, None]:
    monkeypatch.setenv("ADMIN_TOKEN", ADMIN_TOKEN)
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


def test_public_guides_only_show_published_with_published_places(monkeypatch: MonkeyPatch) -> None:
    for client, session in client_with_session(monkeypatch):
        public_place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        draft_place = Place(slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft")
        session.add(public_place)
        session.add(draft_place)
        session.commit()
        session.refresh(public_place)
        session.refresh(draft_place)

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


def test_admin_can_remove_place_from_guide(monkeypatch: MonkeyPatch) -> None:
    for client, session in client_with_session(monkeypatch):
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
