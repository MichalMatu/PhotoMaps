import os
from pathlib import Path

APP_NAME = os.getenv("APP_NAME", "Photomaps")
API_TITLE = os.getenv("API_TITLE", f"{APP_NAME} API")


def get_admin_token() -> str | None:
    return os.getenv("ADMIN_TOKEN")


def get_claim_token_secret() -> str:
    return os.getenv("CLAIM_TOKEN_SECRET", "dev-claim-token-secret")


BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "app.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
STORAGE_DIR = BASE_DIR / "storage"
PRIVATE_STORAGE_DIR = STORAGE_DIR / "private"
PUBLIC_STORAGE_DIR = STORAGE_DIR / "public"

DEFAULT_FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]


def configured_frontend_origins() -> list[str]:
    origins = os.getenv("FRONTEND_ORIGINS")
    if origins:
        return [origin.strip() for origin in origins.split(",") if origin.strip()]
    return DEFAULT_FRONTEND_ORIGINS


FRONTEND_ORIGINS = configured_frontend_origins()
