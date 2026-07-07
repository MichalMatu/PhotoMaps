#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402,F401
from app.core.config import DATABASE_PATH, DATABASE_URL  # noqa: E402
from app.db.schema_validation import database_schema_errors  # noqa: E402


def main() -> int:
    if not DATABASE_PATH.exists():
        print(f"Database not found: {DATABASE_PATH}")
        return 0

    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    problems = database_schema_errors(engine)

    if problems:
        print("Database schema check failed:")
        for problem in problems:
            print(f"- {problem}")
        return 1

    print("Database schema matches current models.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
