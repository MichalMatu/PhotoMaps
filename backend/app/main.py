from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.api.routes import admin_places, categories, places
from app.core.config import FRONTEND_ORIGINS
from app.db.init_db import seed_categories
from app.db.session import create_db_and_tables, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        seed_categories(session)
    yield


app = FastAPI(title="Wroclaw Bez Sciemy API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(places.router)
app.include_router(admin_places.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
