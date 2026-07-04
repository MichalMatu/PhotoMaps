from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import uvicorn

ROOT_DIR = Path(__file__).resolve().parent
ENV_FILE = ROOT_DIR / ".env"


def load_local_env(env_file: Path = ENV_FILE) -> None:
    if not env_file.is_file():
        return

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key:
            os.environ.setdefault(key, value)


BACKEND_DIR = ROOT_DIR / "backend"
AUTOSTART_DISABLED_FILE = ROOT_DIR / ".dev" / "server.autostart.disabled"


def frontend_dist_dir() -> Path:
    return Path(os.getenv("PHOTOMAP_FRONTEND_DIST_DIR", ROOT_DIR / "frontend" / "dist"))


def configure_import_path() -> None:
    backend_path = str(BACKEND_DIR)
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)


def run_migrations() -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head"],
        check=True,
        cwd=BACKEND_DIR,
    )


def create_app():
    configure_import_path()

    from app.main import app
    from app.runtime import mount_frontend_dist

    return mount_frontend_dist(app, frontend_dist_dir())


def main() -> int:
    if AUTOSTART_DISABLED_FILE.exists():
        print(f"PhotoMap server nie startuje: autostart wylaczony ({AUTOSTART_DISABLED_FILE}).")
        return 0

    load_local_env()

    try:
        runtime_app = create_app()
    except FileNotFoundError as exc:
        print(exc)
        print("Zbuduj frontend: cd frontend && npm run build")
        return 1

    run_migrations()

    host = os.getenv("PHOTOMAP_SERVER_HOST", "127.0.0.1")
    port = int(os.getenv("PHOTOMAP_SERVER_PORT", "8000"))
    uvicorn.run(runtime_app, host=host, port=port, lifespan="off")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
