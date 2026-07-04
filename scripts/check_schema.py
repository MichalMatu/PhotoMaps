#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlmodel import SQLModel

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402,F401
from app.core.config import DATABASE_PATH, DATABASE_URL  # noqa: E402


def main() -> int:
    if not DATABASE_PATH.exists():
        print(f"Database not found: {DATABASE_PATH}")
        return 0

    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    problems: list[str] = []

    with engine.connect() as connection:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())

        for table_name, table in SQLModel.metadata.tables.items():
            if table_name not in table_names:
                problems.append(f"{table_name}: missing table")
                continue

            database_columns = {column["name"] for column in inspector.get_columns(table_name)}
            model_columns = set(table.columns.keys())
            extra_columns = sorted(database_columns - model_columns)
            missing_columns = sorted(model_columns - database_columns)

            if extra_columns:
                problems.append(f"{table_name}: extra columns {', '.join(extra_columns)}")
            if missing_columns:
                problems.append(f"{table_name}: missing columns {', '.join(missing_columns)}")

    if problems:
        print("Database schema check failed:")
        for problem in problems:
            print(f"- {problem}")
        return 1

    print("Database schema matches current models.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
