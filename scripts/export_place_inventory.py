#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from sqlmodel import Session, select

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402,F401
from app.core.config import DATABASE_PATH, DATABASE_URL  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.models.category import Category  # noqa: E402
from app.models.city import City  # noqa: E402
from app.models.place import Place  # noqa: E402
from app.services.place_taxonomy import categories_by_place_id  # noqa: E402

DEFAULT_BASE_URL = "https://photomap.pl"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "research-exports" / "place-inventory.json"

CityStatusFilter = Literal["active", "archived", "all"]
PlaceStatusFilter = Literal["published", "draft", "archived", "all"]


def utc_timestamp() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def absolute_url(base_url: str, path: str | None) -> str | None:
    if path is None:
        return None
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def public_place_paths(
    city_id: str, place_slug: str, *, is_public: bool
) -> dict[str, str | None]:
    if not is_public:
        return {
            "page_path": None,
            "api_path": None,
        }
    page_path = f"/places/{city_id}/{place_slug}"
    api_path = f"/api/public/cities/{city_id}/places/{place_slug}"
    return {
        "page_path": page_path,
        "api_path": api_path,
    }


def city_statement(status: CityStatusFilter):
    statement = select(City)
    if status != "all":
        statement = statement.where(City.status == status)
    return statement.order_by(City.sort_order, City.name, City.id)


def place_statement(city_id: str, status: PlaceStatusFilter):
    statement = select(Place).where(Place.city_id == city_id)
    if status != "all":
        statement = statement.where(Place.status == status)
    return statement.order_by(Place.title, Place.slug)


def categories_payload(categories: list[Category]) -> list[dict[str, str | None]]:
    return [
        {
            "id": category.id,
            "label": category.label,
            "description": category.description,
        }
        for category in categories
    ]


def place_payload(
    place: Place,
    city: City,
    categories: list[Category],
    *,
    base_url: str,
) -> dict[str, Any]:
    is_public = city.status == "active" and place.status == "published"
    paths = public_place_paths(city.id, place.slug, is_public=is_public)
    return {
        "slug": place.slug,
        "title": place.title,
        "status": place.status,
        "public": is_public,
        "description": place.description,
        "categories": categories_payload(categories),
        "lat": place.lat,
        "lon": place.lon,
        "photo_count": place.photo_count,
        "memory_count": place.memory_count,
        "page_path": paths["page_path"],
        "page_url": absolute_url(base_url, paths["page_path"]),
        "api_path": paths["api_path"],
        "api_url": absolute_url(base_url, paths["api_path"]),
    }


def build_inventory(
    session: Session,
    *,
    base_url: str = DEFAULT_BASE_URL,
    city_status: CityStatusFilter = "active",
    place_status: PlaceStatusFilter = "published",
    generated_at: str | None = None,
) -> dict[str, Any]:
    cities = list(session.exec(city_statement(city_status)).all())
    city_payloads: list[dict[str, Any]] = []
    total_places = 0

    for city in cities:
        places = list(session.exec(place_statement(city.id, place_status)).all())
        categories_by_place = categories_by_place_id(
            session, [place.id for place in places]
        )
        place_payloads = [
            place_payload(
                place,
                city,
                categories_by_place.get(place.id, []),
                base_url=base_url,
            )
            for place in places
        ]
        total_places += len(place_payloads)
        city_payloads.append(
            {
                "id": city.id,
                "name": city.name,
                "region": city.region,
                "status": city.status,
                "lat": city.lat,
                "lon": city.lon,
                "default_zoom": city.default_zoom,
                "place_count": len(place_payloads),
                "places": place_payloads,
            }
        )

    return {
        "product": "PhotoMap",
        "purpose": (
            "Inventory of cities and places already present in PhotoMap. "
            "Use it to identify important missing places without suggesting duplicates."
        ),
        "ai_prompt_pl": (
            "To jest lista miast i miejsc, które już mam w PhotoMap. "
            "Na jej podstawie wskaż ważne brakujące miejsca dla wybranego miasta. "
            "Nie proponuj duplikatów tych samych obiektów pod inną nazwą."
        ),
        "generated_at": generated_at or utc_timestamp(),
        "source": "local PhotoMap database",
        "base_url": base_url.rstrip("/"),
        "filters": {
            "city_status": city_status,
            "place_status": place_status,
        },
        "summary": {
            "city_count": len(city_payloads),
            "place_count": total_places,
        },
        "cities": city_payloads,
    }


def write_inventory(inventory: dict[str, Any], output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export a lightweight JSON inventory of PhotoMap cities and places for AI gap analysis."
    )
    parser.add_argument(
        "--city-status",
        choices=["active", "archived", "all"],
        default="active",
        help="Which cities to include. Default: active.",
    )
    parser.add_argument(
        "--place-status",
        choices=["published", "draft", "archived", "all"],
        default="published",
        help="Which places to include. Default: published.",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help="Public site base URL used to build page_url and api_url. Default: https://photomap.pl",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Where to save the JSON inventory. Default: research-exports/place-inventory.json",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Also print the generated JSON to stdout.",
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Print or validate the inventory without writing a file.",
    )
    return parser.parse_args()


def ensure_database_available() -> None:
    if DATABASE_URL.startswith("sqlite:///") and not DATABASE_PATH.exists():
        raise FileNotFoundError(
            f"PhotoMap database file does not exist: {DATABASE_PATH}"
        )


def main() -> int:
    args = parse_args()
    try:
        ensure_database_available()
        with Session(engine) as session:
            inventory = build_inventory(
                session,
                base_url=args.base_url,
                city_status=args.city_status,
                place_status=args.place_status,
            )

        if not args.no_write:
            path = write_inventory(inventory, args.output)
            print(f"Zapisano inventory JSON: {path}")
        print(
            "Inventory: "
            f"{inventory['summary']['city_count']} cities, "
            f"{inventory['summary']['place_count']} places "
            f"(city_status={args.city_status}, place_status={args.place_status})."
        )
        if args.stdout:
            print(json.dumps(inventory, ensure_ascii=False, indent=2))
        return 0
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        print(f"Inventory export failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
