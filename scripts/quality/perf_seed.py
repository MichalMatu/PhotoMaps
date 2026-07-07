#!/usr/bin/env python3
from __future__ import annotations

import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image, ImageDraw

PLACE_COUNT = int(os.getenv("PERF_SEED_PLACES", "120"))
GUIDE_COUNT = int(os.getenv("PERF_SEED_GUIDES", "6"))
PLACES_PER_GUIDE = int(os.getenv("PERF_SEED_PLACES_PER_GUIDE", "20"))
CITY_ID = os.getenv("PERF_SEED_CITY_ID", "wroclaw")
START_LAT = 51.09
START_LON = 17.0
ROOT_DIR = Path(__file__).resolve().parents[2]
PERF_DATA_ROOT = ROOT_DIR / ".dev/perf"
PERF_DATA_DIR = PERF_DATA_ROOT / "backend-data"
PERF_STORAGE_DIR = PERF_DATA_ROOT / "storage"


def repo_path(path: Path) -> Path:
    return path if path.is_absolute() else ROOT_DIR / path


def database_path() -> Path:
    database_url = os.getenv("DATABASE_URL", "")
    if database_url.startswith("sqlite:///"):
        return repo_path(Path(database_url.removeprefix("sqlite:///")))

    data_dir = repo_path(Path(os.getenv("PHOTOMAP_DATA_DIR", PERF_DATA_DIR)))
    return data_dir / "app.db"


def storage_path() -> Path:
    return repo_path(Path(os.getenv("PHOTOMAP_STORAGE_DIR", PERF_STORAGE_DIR)))


def ensure_perf_database_path(path: Path) -> None:
    resolved_path = path.resolve()
    resolved_perf_root = PERF_DATA_ROOT.resolve()
    if not resolved_path.is_relative_to(resolved_perf_root):
        raise RuntimeError(f"perf seed refuses to write outside {resolved_perf_root}: {resolved_path}")


def ensure_perf_storage_path(path: Path) -> None:
    resolved_path = path.resolve()
    resolved_perf_root = PERF_DATA_ROOT.resolve()
    if not resolved_path.is_relative_to(resolved_perf_root):
        raise RuntimeError(f"perf seed refuses to write storage outside {resolved_perf_root}: {resolved_path}")


def reset_perf_data(connection: sqlite3.Connection) -> None:
    connection.execute("DELETE FROM place_guide WHERE guide_id LIKE 'perf-guide-%' OR place_id LIKE 'perf-place-%'")
    connection.execute("DELETE FROM guide WHERE id LIKE 'perf-guide-%'")
    connection.execute("DELETE FROM photo WHERE id LIKE 'perf-photo-%' OR place_id LIKE 'perf-place-%'")
    connection.execute("DELETE FROM memory WHERE id LIKE 'perf-memory-%' OR place_id LIKE 'perf-place-%'")
    connection.execute("DELETE FROM place_category WHERE place_id LIKE 'perf-place-%'")
    connection.execute("DELETE FROM place WHERE id LIKE 'perf-place-%'")


def reset_perf_storage(storage_root: Path) -> None:
    for root_name in ("private", "public"):
        root = storage_root / root_name / "photos"
        if not root.exists():
            continue
        for path in root.glob("perf-place-*/*"):
            if path.is_file():
                path.unlink()
        for directory in sorted(root.glob("perf-place-*"), reverse=True):
            if directory.is_dir():
                try:
                    directory.rmdir()
                except OSError:
                    pass


def ensure_perf_city(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        INSERT INTO city (id, name, region, lat, lon, default_zoom, sort_order, status)
        SELECT ?, 'Wrocław', 'Dolnośląskie', 51.1079, 17.0385, 13, 10, 'active'
        WHERE NOT EXISTS (SELECT 1 FROM city WHERE id = ?)
        """,
        (CITY_ID, CITY_ID),
    )


def perf_color(index: int) -> tuple[int, int, int]:
    return (
        64 + (index * 37) % 144,
        72 + (index * 53) % 128,
        96 + (index * 29) % 120,
    )


def write_perf_image(path: Path, *, color: tuple[int, int, int], size: tuple[int, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(image)
    draw.rectangle(
        (size[0] // 2, 0, size[0], size[1]),
        fill=(min(color[0] + 32, 255), max(color[1] - 24, 0), min(color[2] + 16, 255)),
    )
    draw.rectangle(
        (0, size[1] // 2, size[0], size[1]),
        fill=(max(color[0] - 24, 0), min(color[1] + 32, 255), max(color[2] - 16, 0)),
    )
    image.save(path, "PNG", optimize=True)


def seed_place_cover(
    connection: sqlite3.Connection,
    *,
    index: int,
    now: str,
    place_id: str,
    storage_root: Path,
) -> str:
    number = index + 1
    photo_id = f"perf-photo-{number:03d}"
    base_path = f"photos/{place_id}/{photo_id}"
    original_path = f"{base_path}-original.png"
    public_path = f"{base_path}.png"
    thumb_path = f"{base_path}-thumb.png"
    color = perf_color(index)

    write_perf_image(storage_root / "private" / original_path, color=color, size=(96, 72))
    write_perf_image(storage_root / "public" / public_path, color=color, size=(96, 72))
    write_perf_image(storage_root / "public" / thumb_path, color=color, size=(48, 36))

    connection.execute(
        """
        INSERT INTO photo (
            id, place_id, original_path, public_path, thumb_path, role, source,
            status, caption, description_blocks, consent_confirmed, created_at, approved_at
        )
        VALUES (?, ?, ?, ?, ?, 'gallery', 'editorial', 'approved', ?, '[]', 1, ?, ?)
        """,
        (
            photo_id,
            place_id,
            original_path,
            f"/media/{public_path}",
            f"/media/{thumb_path}",
            f"Miniatura testowa miejsca {number:03d}",
            now,
            now,
        ),
    )
    return photo_id


def seed_places(connection: sqlite3.Connection, now: str, storage_root: Path) -> list[str]:
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
        weight = 1 + (index % 4) * 0.5
        connection.execute(
            """
            INSERT INTO place (
                id, city_id, slug, title, description, local_comment, article_blocks,
                lat, lon, weight, status, custom_fields, photo_count, memory_count,
                cover_photo_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, 'published', '{}', 1, 0, NULL, ?, ?)
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
                now,
                now,
            ),
        )
        photo_id = seed_place_cover(
            connection,
            index=index,
            now=now,
            place_id=place_id,
            storage_root=storage_root,
        )
        connection.execute("UPDATE place SET cover_photo_id = ? WHERE id = ?", (photo_id, place_id))
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
            INSERT INTO guide (
                id, slug, kind, title, description, article_blocks, route_points, status, created_at, updated_at
            )
            VALUES (?, ?, 'route', ?, ?, '[]', '[]', 'published', ?, ?)
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
    media_root = storage_path()
    ensure_perf_database_path(path)
    ensure_perf_storage_path(media_root)
    if not path.exists():
        raise RuntimeError(f"database does not exist: {path}")

    now = datetime.now(UTC).isoformat()
    reset_perf_storage(media_root)
    (media_root / "private").mkdir(parents=True, exist_ok=True)
    (media_root / "public").mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as connection:
        ensure_perf_city(connection)
        reset_perf_data(connection)
        place_ids = seed_places(connection, now, media_root)
        seed_guides(connection, place_ids, now)

    print(f"perf seed ok: {PLACE_COUNT} map-ready places for {CITY_ID}, {GUIDE_COUNT} guides")


if __name__ == "__main__":
    main()
