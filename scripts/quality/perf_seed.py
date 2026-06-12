#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

PLACE_COUNT = int(os.getenv("PERF_SEED_PLACES", "120"))
GUIDE_COUNT = int(os.getenv("PERF_SEED_GUIDES", "6"))
PLACES_PER_GUIDE = int(os.getenv("PERF_SEED_PLACES_PER_GUIDE", "20"))
CITY_ID = os.getenv("PERF_SEED_CITY_ID", "wroclaw")
START_LAT = 51.09
START_LON = 17.0
ROOT_DIR = Path(__file__).resolve().parents[2]
PERF_DATA_ROOT = ROOT_DIR / ".dev/perf"
PERF_DATA_DIR = PERF_DATA_ROOT / "backend-data"


def repo_path(path: Path) -> Path:
    return path if path.is_absolute() else ROOT_DIR / path


def database_path() -> Path:
    database_url = os.getenv("DATABASE_URL", "")
    if database_url.startswith("sqlite:///"):
        return repo_path(Path(database_url.removeprefix("sqlite:///")))

    data_dir = repo_path(Path(os.getenv("PHOTOMAP_DATA_DIR", PERF_DATA_DIR)))
    return data_dir / "app.db"


def ensure_perf_database_path(path: Path) -> None:
    resolved_path = path.resolve()
    resolved_perf_root = PERF_DATA_ROOT.resolve()
    if not resolved_path.is_relative_to(resolved_perf_root):
        raise RuntimeError(f"perf seed refuses to write outside {resolved_perf_root}: {resolved_path}")


def reset_perf_data(connection: sqlite3.Connection) -> None:
    connection.execute("DELETE FROM place_guide WHERE guide_id LIKE 'perf-guide-%' OR place_id LIKE 'perf-place-%'")
    connection.execute("DELETE FROM guide WHERE id LIKE 'perf-guide-%'")
    connection.execute("DELETE FROM place_category WHERE place_id LIKE 'perf-place-%'")
    connection.execute("DELETE FROM place WHERE id LIKE 'perf-place-%'")


def ensure_perf_city(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        INSERT INTO city (id, name, lat, lon, default_zoom, sort_order, status)
        SELECT ?, 'Wrocław', 51.1079, 17.0385, 13, 10, 'active'
        WHERE NOT EXISTS (SELECT 1 FROM city WHERE id = ?)
        """,
        (CITY_ID, CITY_ID),
    )


def seed_places(connection: sqlite3.Connection, now: str) -> list[str]:
    category_ids = [
        row[0] for row in connection.execute("SELECT id FROM category WHERE status = 'active' ORDER BY sort_order")
    ]
    if not category_ids:
        raise RuntimeError("perf seed requires active categories from migrations")

    place_ids: list[str] = []
    for index in range(PLACE_COUNT):
        number = index + 1
        place_id = f"perf-place-{number:03d}"
        category_id = category_ids[index % len(category_ids)]
        lat = START_LAT + (index // 12) * 0.003
        lon = START_LON + (index % 12) * 0.004
        photo_count = index % 5
        memory_count = index % 4
        weight = 1 + (index % 4) * 0.5
        connection.execute(
            """
            INSERT INTO place (
                id, city_id, slug, title, description, local_comment, lat, lon, weight,
                status, photo_count, memory_count, cover_photo_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, NULL, ?, ?)
            """,
            (
                place_id,
                CITY_ID,
                f"perf-place-{number:03d}",
                f"Perf miejsce {number:03d}",
                "Miejsce testowe do pomiaru publicznych endpointow.",
                "Lokalny komentarz do pomiaru wydajnosci.",
                lat,
                lon,
                weight,
                photo_count,
                memory_count,
                now,
                now,
            ),
        )
        connection.execute(
            """
            INSERT INTO place_category (place_id, category_id, sort_order)
            VALUES (?, ?, 0)
            """,
            (place_id, category_id),
        )
        place_ids.append(place_id)

    return place_ids


def seed_guides(connection: sqlite3.Connection, place_ids: list[str], now: str) -> None:
    for guide_index in range(GUIDE_COUNT):
        guide_number = guide_index + 1
        guide_id = f"perf-guide-{guide_number:02d}"
        connection.execute(
            """
            INSERT INTO guide (id, slug, title, description, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'published', ?, ?)
            """,
            (
                guide_id,
                f"perf-guide-{guide_number:02d}",
                f"Perf przewodnik {guide_number:02d}",
                "Przewodnik testowy do pomiaru list i szczegolow.",
                now,
                now,
            ),
        )

        start = guide_index * PLACES_PER_GUIDE
        selected_places = place_ids[start : start + PLACES_PER_GUIDE]
        for sort_order, place_id in enumerate(selected_places, start=1):
            connection.execute(
                "INSERT INTO place_guide (guide_id, place_id, sort_order) VALUES (?, ?, ?)",
                (guide_id, place_id, sort_order),
            )


def main() -> None:
    path = database_path()
    ensure_perf_database_path(path)
    if not path.exists():
        raise RuntimeError(f"database does not exist: {path}")

    now = datetime.now(UTC).isoformat()
    with sqlite3.connect(path) as connection:
        ensure_perf_city(connection)
        reset_perf_data(connection)
        place_ids = seed_places(connection, now)
        seed_guides(connection, place_ids, now)

    print(f"perf seed ok: {PLACE_COUNT} places, {GUIDE_COUNT} guides")


if __name__ == "__main__":
    main()
