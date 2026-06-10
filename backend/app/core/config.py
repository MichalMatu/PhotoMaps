import os
from pathlib import Path

APP_NAME = os.getenv("APP_NAME", "Photomaps")
API_TITLE = os.getenv("API_TITLE", f"{APP_NAME} API")

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"
DATABASE_PATH = DATA_DIR / "app.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
STORAGE_DIR = BASE_DIR / "storage"
PRIVATE_STORAGE_DIR = STORAGE_DIR / "private"
PUBLIC_STORAGE_DIR = STORAGE_DIR / "public"

FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
