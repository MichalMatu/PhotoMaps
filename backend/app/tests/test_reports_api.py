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


def test_public_report_can_be_created_and_closed_by_admin(monkeypatch: MonkeyPatch) -> None:
    for client, session in client_with_session(monkeypatch):
        place = Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published")
        session.add(place)
        session.commit()
        session.refresh(place)

        create_response = client.post(
            "/api/reports",
            json={
                "target_type": "place",
                "target_id": place.id,
                "reason": "wrong_data",
                "message": "Adres jest nieaktualny.",
            },
        )
        report_id = create_response.json()["id"]

        list_response = client.get("/api/admin/reports", headers=ADMIN_HEADERS)
        close_response = client.patch(
            f"/api/admin/reports/{report_id}",
            headers=ADMIN_HEADERS,
            json={"status": "closed"},
        )

        assert create_response.status_code == 201
        assert create_response.json()["status"] == "open"
        assert list_response.status_code == 200
        assert list_response.json()[0]["id"] == report_id
        assert close_response.status_code == 200
        assert close_response.json()["status"] == "closed"


def test_report_rejects_unsupported_target_type(monkeypatch: MonkeyPatch) -> None:
    for client, _session in client_with_session(monkeypatch):
        response = client.post(
            "/api/reports",
            json={"target_type": "unknown", "target_id": "x", "reason": "bad"},
        )

        assert response.status_code == 422


def test_report_rejects_missing_target(monkeypatch: MonkeyPatch) -> None:
    for client, _session in client_with_session(monkeypatch):
        response = client.post(
            "/api/reports",
            json={"target_type": "place", "target_id": "missing-place", "reason": "wrong_data"},
        )

        assert response.status_code == 404
