from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from pytest import MonkeyPatch
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.core.rate_limit import public_rate_limiter
from app.db.session import get_session
from app.main import app
from app.models.city import City
from app.services.media import images
from app.tests.support.auth import ADMIN_TOKEN


@pytest.fixture
def client_session(monkeypatch: MonkeyPatch, tmp_path) -> Generator[tuple[TestClient, Session], None, None]:
    public_rate_limiter.clear()
    monkeypatch.setenv("ADMIN_TOKEN", ADMIN_TOKEN)
    monkeypatch.setattr(images, "PRIVATE_STORAGE_DIR", tmp_path / "private")
    monkeypatch.setattr(images, "PUBLIC_STORAGE_DIR", tmp_path / "public")

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(City(id="wroclaw", name="Wrocław", lat=51.1079, lon=17.0385, default_zoom=13, sort_order=10))
        session.commit()

        def override_session() -> Generator[Session, None, None]:
            yield session

        app.dependency_overrides[get_session] = override_session
        yield TestClient(app), session
        app.dependency_overrides.clear()
        public_rate_limiter.clear()
