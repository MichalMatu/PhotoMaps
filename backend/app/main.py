from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import (
    admin_app_config,
    admin_categories,
    admin_cities,
    admin_guides,
    admin_local_data,
    admin_memories,
    admin_moderation,
    admin_photos,
    admin_place_photos,
    admin_places,
    admin_reports,
    app_config,
    categories,
    cities,
    guides,
    memories,
    photos,
    places,
    reports,
)
from app.core.config import API_TITLE, FRONTEND_ORIGINS, PUBLIC_STORAGE_DIR
from app.core.request_context import (
    REQUEST_ID_HEADER,
    http_exception_handler,
    request_context_middleware,
    validation_exception_handler,
)
from app.db.session import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title=API_TITLE, lifespan=lifespan)
app.middleware("http")(request_context_middleware)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[REQUEST_ID_HEADER],
)

app.include_router(categories.router)
app.include_router(app_config.router)
app.include_router(cities.router)
app.include_router(places.router)
app.include_router(photos.router)
app.include_router(memories.router)
app.include_router(guides.router)
app.include_router(reports.router)
app.include_router(admin_app_config.router)
app.include_router(admin_categories.router)
app.include_router(admin_cities.router)
app.include_router(admin_places.router)
app.include_router(admin_place_photos.router)
app.include_router(admin_photos.router)
app.include_router(admin_memories.router)
app.include_router(admin_moderation.router)
app.include_router(admin_guides.router)
app.include_router(admin_reports.router)
app.include_router(admin_local_data.router)
app.mount("/media", StaticFiles(directory=PUBLIC_STORAGE_DIR, check_dir=False), name="media")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
