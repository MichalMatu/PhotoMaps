#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

PLACE_COUNT = int(os.getenv("PERF_SEED_PLACES", "120"))
GUIDE_COUNT = int(os.getenv("PERF_SEED_GUIDES", "6"))
PLACES_PER_GUIDE = int(os.getenv("PERF_SEED_PLACES_PER_GUIDE", "20"))
START_LAT = 51.09
START_LON = 17.0


def database_path() -> Path:
    database_url = os.getenv("DATABASE_URL", "")
    if database_url.startswith("sqlite:///"):
        return Path(database_url.removeprefix("sqlite:///"))

    data_dir = Path(os.getenv("PHOTOMAP_DATA_DIR", Path("backend/data")))
    return data_dir / "app.db"


def reset_perf_data(connection: sqlite3.Connection) -> None:
    connection.execute(
        "DELETE FROM place_guide WHERE guide_id LIKE 'perf-guide-%' OR place_id LIKE 'perf-place-%'"
    )
    connection.execute("DELETE FROM guide WHERE id LIKE 'perf-guide-%'")
    connection.execute("DELETE FROM place WHERE id LIKE 'perf-place-%'")


def seed_places(connection: sqlite3.Connection, now: str) -> list[str]:
    category_ids = [
        row[0]
        for row in connection.execute(
            "SELECT id FROM category WHERE status = 'active' ORDER BY sort_order"
        )
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
                id, slug, title, description, local_comment, category_id, lat, lon, weight,
                status, photo_count, memory_count, cover_photo_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, NULL, ?, ?)
            """,
            (
                place_id,
                f"perf-place-{number:03d}",
                f"Perf miejsce {number:03d}",
                "Miejsce testowe do pomiaru publicznych endpointow.",
                "Lokalny komentarz do pomiaru wydajnosci.",
                category_id,
                lat,
                lon,
                weight,
                photo_count,
                memory_count,
                now,
                now,
            ),
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
    if not path.exists():
        raise RuntimeError(f"database does not exist: {path}")

    now = datetime.now(UTC).isoformat()
    with sqlite3.connect(path) as connection:
        reset_perf_data(connection)
        place_ids = seed_places(connection, now)
        seed_guides(connection, place_ids, now)

    print(f"perf seed ok: {PLACE_COUNT} places, {GUIDE_COUNT} guides")


if __name__ == "__main__":
    main()
