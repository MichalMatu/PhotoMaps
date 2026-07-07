#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from math import isfinite
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlmodel import Session, select  # noqa: E402

from app.db.session import create_db_and_tables, engine  # noqa: E402
from app.models.city import City  # noqa: E402
from app.models.guide import Guide, PlaceGuide  # noqa: E402
from app.models.place import Place  # noqa: E402
from app.schemas.app_config import PlaceCustomFieldDefinition  # noqa: E402
from app.services.app_config import (  # noqa: E402
    get_place_custom_field_definitions,
    normalize_place_custom_fields,
)
from app.services.cities import CITY_STATUSES  # noqa: E402
from app.services.guides import GUIDE_KINDS, GUIDE_STATUSES  # noqa: E402
from app.services.place_taxonomy import active_category_validation, replace_place_categories  # noqa: E402
from app.services.places import PLACE_STATUSES  # noqa: E402

CONTENT_BLOCK_TYPES = {"heading", "subheading", "paragraph", "link"}


@dataclass
class ImportSummary:
    cities_created: int = 0
    cities_updated: int = 0
    places_created: int = 0
    places_updated: int = 0
    guides_created: int = 0
    guides_updated: int = 0
    guide_places: int = 0


def utc_now() -> datetime:
    return datetime.now(UTC)


def require_mapping(value: Any, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f"{context} must be an object")
    return value


def require_list(value: Any, context: str) -> list[Any]:
    if not isinstance(value, list):
        raise ValueError(f"{context} must be a list")
    return value


def require_string(value: Any, context: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{context} must be a non-empty string")
    return value.strip()


def optional_string(value: Any, context: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{context} must be a string or null")
    normalized = value.strip()
    return normalized or None


def require_float(value: Any, context: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"{context} must be a number")
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{context} must be a number") from exc
    if not isfinite(number):
        raise ValueError(f"{context} must be a finite number")
    return number


def require_status(value: Any, allowed: set[str], context: str) -> str:
    status = require_string(value, context)
    if status not in allowed:
        raise ValueError(f"{context} must be one of: {', '.join(sorted(allowed))}")
    return status


def ensure_active_categories(session: Session, category_ids: list[str], context: str) -> list[str]:
    requested_ids = [require_string(category_id, context) for category_id in category_ids]
    normalized_ids, invalid_ids = active_category_validation(session, requested_ids)
    if invalid_ids:
        raise ValueError(f"{context} must reference active categories: {', '.join(invalid_ids)}")
    return normalized_ids


def require_string_list(value: Any, context: str) -> list[str]:
    return [require_string(item, f"{context}[{index}]") for index, item in enumerate(require_list(value, context))]


def require_url(value: Any, context: str) -> str:
    url = require_string(value, context)
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{context} must be a valid HTTP(S) URL")
    return url


def normalize_content_blocks(value: Any, context: str) -> list[dict[str, str]]:
    blocks: list[dict[str, str]] = []
    for index, raw_block in enumerate(require_list(value, context)):
        block = require_mapping(raw_block, f"{context}[{index}]")
        block_type = require_status(block.get("type"), CONTENT_BLOCK_TYPES, f"{context}[{index}].type")
        normalized_block = {
            "type": block_type,
            "text": require_string(block.get("text"), f"{context}[{index}].text"),
        }
        if block_type == "link":
            normalized_block["url"] = require_url(block.get("url"), f"{context}[{index}].url")
        elif "url" in block:
            raise ValueError(f"{context}[{index}].url is only allowed for link blocks")
        blocks.append(normalized_block)
    return blocks


def normalize_route_points(value: Any, context: str) -> list[dict[str, float]]:
    points: list[dict[str, float]] = []
    for index, raw_point in enumerate(require_list(value, context)):
        point = require_mapping(raw_point, f"{context}[{index}]")
        lat = require_float(point.get("lat"), f"{context}[{index}].lat")
        lon = require_float(point.get("lon"), f"{context}[{index}].lon")
        if lat < -90 or lat > 90:
            raise ValueError(f"{context}[{index}].lat must be between -90 and 90")
        if lon < -180 or lon > 180:
            raise ValueError(f"{context}[{index}].lon must be between -180 and 180")
        points.append({"lat": lat, "lon": lon})
    return points


def place_by_slug(session: Session, slug: str) -> Place | None:
    return session.exec(select(Place).where(Place.slug == slug)).first()


def guide_by_slug(session: Session, slug: str) -> Guide | None:
    return session.exec(select(Guide).where(Guide.slug == slug)).first()


def upsert_city(session: Session, raw_city: dict[str, Any], summary: ImportSummary) -> City:
    city_id = require_string(raw_city.get("id"), "city.id")
    data = {
        "id": city_id,
        "name": require_string(raw_city.get("name"), f"city[{city_id}].name"),
        "region": require_string(raw_city.get("region"), f"city[{city_id}].region"),
        "lat": require_float(raw_city.get("lat"), f"city[{city_id}].lat"),
        "lon": require_float(raw_city.get("lon"), f"city[{city_id}].lon"),
        "default_zoom": int(raw_city.get("default_zoom", 13)),
        "sort_order": int(raw_city.get("sort_order", 0)),
        "status": require_status(raw_city.get("status", "active"), CITY_STATUSES, f"city[{city_id}].status"),
    }

    city = session.get(City, city_id)
    if city is None:
        city = City(**data)
        session.add(city)
        session.flush()
        summary.cities_created += 1
        return city

    for key, value in data.items():
        setattr(city, key, value)
    session.add(city)
    session.flush()
    summary.cities_updated += 1
    return city


def upsert_place(
    session: Session,
    city: City,
    raw_place: dict[str, Any],
    summary: ImportSummary,
    custom_field_definitions: list[PlaceCustomFieldDefinition],
) -> Place:
    slug = require_string(raw_place.get("slug"), "place.slug")
    category_ids = ensure_active_categories(
        session,
        require_string_list(raw_place.get("category_ids", []), f"place[{slug}].category_ids"),
        f"place[{slug}].category_ids",
    )

    data = {
        "city_id": city.id,
        "slug": slug,
        "title": require_string(raw_place.get("title"), f"place[{slug}].title"),
        "description": optional_string(raw_place.get("description"), f"place[{slug}].description"),
        "local_comment": optional_string(raw_place.get("local_comment"), f"place[{slug}].local_comment"),
        "article_blocks": normalize_content_blocks(
            raw_place.get("article_blocks", []),
            f"place[{slug}].article_blocks",
        ),
        "lat": require_float(raw_place.get("lat"), f"place[{slug}].lat"),
        "lon": require_float(raw_place.get("lon"), f"place[{slug}].lon"),
        "weight": require_float(raw_place.get("weight", 1.0), f"place[{slug}].weight"),
        "status": require_status(raw_place.get("status", "draft"), PLACE_STATUSES, f"place[{slug}].status"),
        "custom_fields": normalize_place_custom_fields(
            raw_place.get("custom_fields", {}),
            definitions=custom_field_definitions,
            context=f"place[{slug}].custom_fields",
        ),
    }

    place = place_by_slug(session, slug)
    if place is None:
        place = Place(**data)
        session.add(place)
        session.flush()
        replace_place_categories(session, place.id, category_ids)
        summary.places_created += 1
        return place

    for key, value in data.items():
        setattr(place, key, value)
    place.updated_at = utc_now()
    session.add(place)
    session.flush()
    replace_place_categories(session, place.id, category_ids)
    summary.places_updated += 1
    return place


def upsert_guide(session: Session, raw_guide: dict[str, Any], summary: ImportSummary) -> Guide:
    slug = require_string(raw_guide.get("slug"), "guide.slug")
    data = {
        "slug": slug,
        "kind": require_status(raw_guide.get("kind", "route"), GUIDE_KINDS, f"guide[{slug}].kind"),
        "title": require_string(raw_guide.get("title"), f"guide[{slug}].title"),
        "description": optional_string(raw_guide.get("description"), f"guide[{slug}].description"),
        "article_blocks": normalize_content_blocks(
            raw_guide.get("article_blocks", []),
            f"guide[{slug}].article_blocks",
        ),
        "route_points": normalize_route_points(raw_guide.get("route_points", []), f"guide[{slug}].route_points"),
        "status": require_status(raw_guide.get("status", "draft"), GUIDE_STATUSES, f"guide[{slug}].status"),
    }
    if data["kind"] == "collection" and data["route_points"]:
        raise ValueError(f"guide[{slug}].route_points must be empty for collections")

    guide = guide_by_slug(session, slug)
    if guide is None:
        guide = Guide(**data)
        session.add(guide)
        session.flush()
        summary.guides_created += 1
        return guide

    for key, value in data.items():
        setattr(guide, key, value)
    guide.updated_at = utc_now()
    session.add(guide)
    session.flush()
    summary.guides_updated += 1
    return guide


def replace_guide_places(session: Session, guide: Guide, raw_places: Any, summary: ImportSummary) -> None:
    for existing in session.exec(select(PlaceGuide).where(PlaceGuide.guide_id == guide.id)).all():
        session.delete(existing)
    session.flush()

    for index, raw_place in enumerate(require_list(raw_places, f"guide[{guide.slug}].places")):
        place_ref = require_mapping(raw_place, f"guide[{guide.slug}].places[{index}]")
        place_slug = require_string(place_ref.get("slug"), f"guide[{guide.slug}].places[{index}].slug")
        place = place_by_slug(session, place_slug)
        if place is None:
            raise ValueError(f"Guide {guide.slug} references unknown place: {place_slug}")
        if place.status != "published":
            raise ValueError(f"Guide {guide.slug} references non-published place: {place_slug}")
        place_guide = PlaceGuide(
            guide_id=guide.id,
            place_id=place.id,
            sort_order=int(place_ref.get("sort_order", index)),
        )
        session.add(place_guide)
        summary.guide_places += 1


def import_city_manifest(
    manifest_path: Path,
    *,
    session: Session,
    apply_changes: bool = True,
) -> ImportSummary:
    manifest_path = manifest_path.resolve()
    manifest = require_mapping(json.loads(manifest_path.read_text()), "manifest")
    summary = ImportSummary()
    city = upsert_city(session, require_mapping(manifest.get("city"), "manifest.city"), summary)
    custom_field_definitions = get_place_custom_field_definitions(session)

    for index, raw_place in enumerate(require_list(manifest.get("places", []), "manifest.places")):
        upsert_place(
            session,
            city,
            require_mapping(raw_place, f"manifest.places[{index}]"),
            summary,
            custom_field_definitions,
        )

    for index, raw_guide in enumerate(require_list(manifest.get("guides", []), "manifest.guides")):
        guide_data = require_mapping(raw_guide, f"manifest.guides[{index}]")
        guide = upsert_guide(session, guide_data, summary)
        replace_guide_places(session, guide, guide_data.get("places", []), summary)

    if apply_changes:
        session.commit()
    else:
        session.rollback()
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import city content into the local PhotoMap database.")
    parser.add_argument("manifest", type=Path, help="Path to a city content JSON manifest.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and summarize without changing DB or storage.",
    )
    mode.add_argument("--apply", action="store_true", help="Apply manifest changes to DB and storage.")
    parser.add_argument("--json", action="store_true", help="Print the full JSON report.")
    parser.add_argument("--output-json", type=Path, help="Write the full JSON report to this path.")
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Return a failure code for warnings as well as errors.",
    )
    return parser.parse_args()


def import_report(summary: ImportSummary, *, apply_changes: bool) -> dict[str, Any]:
    return {
        "generated_at": utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "mode": "apply" if apply_changes else "dry-run",
        "status": "ok",
        "summary": asdict(summary),
        "issues": {"total": 0, "by_severity": {"error": 0, "warning": 0, "info": 0}},
    }


def format_import_report(report: dict[str, Any]) -> str:
    summary = report["summary"]
    return (
        f"PhotoMap content import ({report['mode']}): "
        f"{summary['cities_created']} cities created, "
        f"{summary['cities_updated']} cities updated, "
        f"{summary['places_created']} places created, "
        f"{summary['places_updated']} places updated, "
        f"{summary['guides_created']} guides created, "
        f"{summary['guides_updated']} guides updated, "
        f"{summary['guide_places']} guide-place links."
    )


def main() -> int:
    args = parse_args()
    apply_changes = bool(args.apply)
    create_db_and_tables()
    with Session(engine) as session:
        summary = import_city_manifest(
            args.manifest,
            session=session,
            apply_changes=apply_changes,
        )
    report = import_report(summary, apply_changes=apply_changes)

    if args.output_json:
        output_path = args.output_json if args.output_json.is_absolute() else REPO_ROOT / args.output_json
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_import_report(report))

    issue_counts = report["issues"]["by_severity"]
    if issue_counts["error"] > 0:
        return 1
    if args.strict and (issue_counts["warning"] > 0 or issue_counts["info"] > 0):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
