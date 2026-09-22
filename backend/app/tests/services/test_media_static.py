from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.media_static import PUBLIC_MEDIA_CACHE_HEADERS, PublicMediaStaticFiles


def test_public_media_static_files_use_reusable_browser_cache(tmp_path) -> None:
    (tmp_path / "thumb.jpg").write_bytes(b"thumb")
    app = FastAPI()
    app.mount("/media", PublicMediaStaticFiles(directory=tmp_path), name="media")

    response = TestClient(app).get("/media/thumb.jpg")

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == PUBLIC_MEDIA_CACHE_HEADERS["Cache-Control"]
