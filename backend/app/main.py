from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import admin_categories, admin_photos, admin_places, categories, photos, places
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
app.include_router(places.router)
app.include_router(photos.router)
app.include_router(admin_categories.router)
app.include_router(admin_places.router)
app.include_router(admin_photos.router)
app.mount("/media", StaticFiles(directory=PUBLIC_STORAGE_DIR, check_dir=False), name="media")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
