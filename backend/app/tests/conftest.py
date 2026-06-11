from collections.abc import Generator
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pytest import MonkeyPatch
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.db.session import get_session
from app.main import app
from app.models.place import Place
from app.services.media import images

ADMIN_TOKEN = "test-admin-token"
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
BAD_ADMIN_HEADERS = {"Authorization": "Bearer wrong-token"}


@pytest.fixture
def client_session(monkeypatch: MonkeyPatch, tmp_path) -> Generator[tuple[TestClient, Session], None, None]:
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

        def override_session() -> Generator[Session, None, None]:
            yield session

        app.dependency_overrides[get_session] = override_session
        yield TestClient(app), session
        app.dependency_overrides.clear()


def image_upload(filename: str = "upload.jpg") -> tuple[str, BytesIO, str]:
    buffer = BytesIO()
    image = Image.new("RGB", (16, 16), (18, 106, 90))
    image.save(buffer, format="JPEG", exif=b"example-exif")
    buffer.seek(0)
    return filename, buffer, "image/jpeg"


def png_upload(filename: str = "upload.png") -> tuple[str, BytesIO, str]:
    buffer = BytesIO()
    image = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for x in range(4, 12):
        for y in range(4, 12):
            image.putpixel((x, y), (180, 64, 32, 180))
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return filename, buffer, "image/png"


def create_place(
    session: Session,
    *,
    lat: float = 51.11,
    lon: float = 17.03,
    slug: str = "public-place",
    status: str = "published",
    title: str = "Public",
    **overrides,
) -> Place:
    place = Place(slug=slug, title=title, lat=lat, lon=lon, status=status, **overrides)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place
