from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

RESERVED_FRONTEND_PATHS = (
    "/api",
    "/health",
    "/media",
    "/docs",
    "/redoc",
    "/openapi.json",
)


def frontend_static_file(dist_dir: Path, frontend_path: str) -> Path | None:
    if not frontend_path:
        return None

    dist_root = dist_dir.resolve()
    static_file = (dist_root / frontend_path).resolve()
    if not static_file.is_relative_to(dist_root) or not static_file.is_file():
        return None
    return static_file


def mount_frontend_dist(app: FastAPI, dist_dir: Path) -> FastAPI:
    index_file = dist_dir / "index.html"
    if not index_file.is_file():
        raise FileNotFoundError(f"Missing frontend build: {index_file}")

    assets_dir = dist_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{frontend_path:path}", include_in_schema=False)
    def serve_frontend(frontend_path: str) -> FileResponse:
        request_path = f"/{frontend_path}"
        if request_path.startswith(RESERVED_FRONTEND_PATHS):
            raise HTTPException(status_code=404, detail="Not found")

        static_file = frontend_static_file(dist_dir, frontend_path)
        if static_file is not None:
            return FileResponse(static_file)
        return FileResponse(index_file)

    return app
