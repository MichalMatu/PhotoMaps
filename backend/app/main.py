from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    admin_categories,
    admin_cities,
    admin_guides,
    admin_memories,
    admin_photos,
    admin_places,
    admin_reports,
    categories,
    cities,
    guides,
    memories,
    photos,
    places,
    reports,
)
from app.core.config import API_TITLE, FRONTEND_ORIGINS, PUBLIC_STORAGE_DIR
from app.db.session import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title=API_TITLE, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(cities.router)
app.include_router(places.router)
app.include_router(photos.router)
app.include_router(memories.router)
app.include_router(guides.router)
app.include_router(reports.router)
app.include_router(admin_categories.router)
app.include_router(admin_cities.router)
app.include_router(admin_places.router)
app.include_router(admin_photos.router)
app.include_router(admin_memories.router)
app.include_router(admin_guides.router)
app.include_router(admin_reports.router)
app.mount("/media", StaticFiles(directory=PUBLIC_STORAGE_DIR, check_dir=False), name="media")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
