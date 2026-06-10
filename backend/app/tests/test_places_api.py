from collections.abc import Generator
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.session import get_session
from app.main import app
from app.models.category import Category
from app.models.photo import Photo
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


def test_public_places_only_show_published(monkeypatch: MonkeyPatch) -> None:
    for client, session in client_with_session(monkeypatch):
        session.add(Place(slug="public-place", title="Public", lat=51.11, lon=17.03, status="published"))
        session.add(Place(slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
        session.commit()

        response = client.get("/api/places")

        assert response.status_code == 200
        assert [place["slug"] for place in response.json()] == ["public-place"]


def test_public_place_detail_hides_draft_and_archived(monkeypatch: MonkeyPatch) -> None:
    for client, session in client_with_session(monkeypatch):
        session.add(Place(slug="draft-place", title="Draft", lat=51.12, lon=17.04, status="draft"))
        session.add(Place(slug="old-place", title="Old", lat=51.13, lon=17.05, status="archived"))
        session.commit()

        assert client.get("/api/places/draft-place").status_code == 404
        assert client.get("/api/places/old-place").status_code == 404


def test_admin_can_list_and_archive_places(monkeypatch: MonkeyPatch) -> None:
    for client, session in client_with_session(monkeypatch):
        place = Place(slug="admin-place", title="Admin", lat=51.12, lon=17.04, status="draft")
        session.add(place)
        session.commit()
        session.refresh(place)

        list_response = client.get("/api/admin/places", headers=ADMIN_HEADERS)
        archive_response = client.delete(f"/api/admin/places/{place.id}", headers=ADMIN_HEADERS)

        assert list_response.status_code == 200
        assert list_response.json()[0]["slug"] == "admin-place"
        assert archive_response.status_code == 200
        assert archive_response.json()["status"] == "archived"
        assert session.get(Place, place.id) is not None


def test_map_places_return_ranked_public_summary_without_private_paths(monkeypatch: MonkeyPatch) -> None:
    for client, session in client_with_session(monkeypatch):
        category = Category(id="coffee", label="Kawa", sort_order=1)
        top_place = Place(
            slug="top-place",
            title="Top",
            category_id=category.id,
            lat=51.11,
            lon=17.03,
            status="published",
            photo_count=1,
            memory_count=2,
            weight=2,
        )
        lower_place = Place(
            slug="lower-place",
            title="Lower",
            category_id=category.id,
            lat=51.12,
            lon=17.04,
            status="published",
            photo_count=1,
            memory_count=0,
            weight=1,
        )
        draft_place = Place(slug="draft-place", title="Draft", lat=51.13, lon=17.05, status="draft")
        session.add(category)
        session.add(top_place)
        session.add(lower_place)
        session.add(draft_place)
        session.commit()
        session.refresh(top_place)
        cover_photo = Photo(
            place_id=top_place.id,
            original_path="photos/private-original.jpg",
            public_path="/media/photos/public.jpg",
            thumb_path="/media/photos/thumb.jpg",
            status="approved",
            approved_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        session.add(cover_photo)
        session.commit()
        session.refresh(cover_photo)
        top_place.cover_photo_id = cover_photo.id
        session.add(top_place)
        session.commit()

        response = client.get("/api/places/map")

        assert response.status_code == 200
        body = response.json()
        assert [place["slug"] for place in body] == ["top-place", "lower-place"]
        assert body[0]["category"]["id"] == "coffee"
        assert body[0]["cover_photo"]["thumb_path"] == "/media/photos/thumb.jpg"
        assert "original_path" not in body[0]["cover_photo"]
        assert body[0]["photos"][0]["id"] == cover_photo.id
