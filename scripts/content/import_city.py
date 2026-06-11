#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlmodel import Session, select  # noqa: E402

from app.db.session import create_db_and_tables, engine  # noqa: E402
from app.models.category import Category  # noqa: E402
from app.models.guide import Guide, PlaceGuide  # noqa: E402
from app.models.photo import Photo  # noqa: E402
from app.models.place import Place  # noqa: E402
from app.services.media.images import store_image_bytes  # noqa: E402

PLACE_STATUSES = {"draft", "published", "archived"}
GUIDE_STATUSES = {"draft", "published", "archived"}


@dataclass
class ImportSummary:
    places_created: int = 0
    places_updated: int = 0
    icons_imported: int = 0
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
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{context} must be a number") from exc


def require_status(value: Any, allowed: set[str], context: str) -> str:
    status = require_string(value, context)
    if status not in allowed:
        raise ValueError(f"{context} must be one of: {', '.join(sorted(allowed))}")
    return status


def resolve_asset_path(manifest_path: Path, raw_path: str, repo_root: Path) -> Path:
    path = Path(raw_path).expanduser()
    candidates = [path] if path.is_absolute() else [manifest_path.parent / path, repo_root / path]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    raise FileNotFoundError(f"Asset not found: {raw_path}")


def ensure_active_category(session: Session, category_id: str | None) -> None:
    if category_id is None:
        return
    category = session.get(Category, category_id)
    if category is None or category.status != "active":
        raise ValueError(f"Category must be active: {category_id}")


def place_by_slug(session: Session, slug: str) -> Place | None:
    return session.exec(select(Place).where(Place.slug == slug)).first()


def guide_by_slug(session: Session, slug: str) -> Guide | None:
    return session.exec(select(Guide).where(Guide.slug == slug)).first()


def upsert_place(session: Session, raw_place: dict[str, Any], summary: ImportSummary) -> Place:
    slug = require_string(raw_place.get("slug"), "place.slug")
    category_id = optional_string(raw_place.get("category_id"), f"place[{slug}].category_id")
    ensure_active_category(session, category_id)

    data = {
        "slug": slug,
        "title": require_string(raw_place.get("title"), f"place[{slug}].title"),
        "description": optional_string(raw_place.get("description"), f"place[{slug}].description"),
        "local_comment": optional_string(raw_place.get("local_comment"), f"place[{slug}].local_comment"),
        "category_id": category_id,
        "lat": require_float(raw_place.get("lat"), f"place[{slug}].lat"),
        "lon": require_float(raw_place.get("lon"), f"place[{slug}].lon"),
        "weight": require_float(raw_place.get("weight", 1.0), f"place[{slug}].weight"),
        "status": require_status(raw_place.get("status", "draft"), PLACE_STATUSES, f"place[{slug}].status"),
    }

    place = place_by_slug(session, slug)
    if place is None:
        place = Place(**data)
        session.add(place)
        session.flush()
        summary.places_created += 1
        return place

    for key, value in data.items():
        setattr(place, key, value)
    place.updated_at = utc_now()
    session.add(place)
    session.flush()
    summary.places_updated += 1
    return place


def import_place_icon(
    session: Session,
    manifest_path: Path,
    repo_root: Path,
    place: Place,
    raw_place: dict[str, Any],
    summary: ImportSummary,
    *,
    replace_covers: bool,
) -> None:
    icon_path = optional_string(raw_place.get("cover_icon_path"), f"place[{place.slug}].cover_icon_path")
    if icon_path is None:
        return
    if place.cover_photo_id is not None and not replace_covers:
        return

    asset_path = resolve_asset_path(manifest_path, icon_path, repo_root)
    stored_image = store_image_bytes(asset_path.read_bytes(), asset_path.name, place.id, "photos")
    photo = Photo(
        place_id=place.id,
        original_path=stored_image.original_path,
        public_path=stored_image.public_path,
        thumb_path=stored_image.thumb_path,
        status="approved",
        caption=optional_string(raw_place.get("cover_caption"), f"place[{place.slug}].cover_caption"),
        consent_confirmed=True,
        approved_at=utc_now(),
    )
    session.add(photo)
    session.flush()
    place.photo_count += 1
    place.cover_photo_id = photo.id
    place.updated_at = utc_now()
    session.add(place)
    summary.icons_imported += 1


def upsert_guide(session: Session, raw_guide: dict[str, Any], summary: ImportSummary) -> Guide:
    slug = require_string(raw_guide.get("slug"), "guide.slug")
    data = {
        "slug": slug,
        "title": require_string(raw_guide.get("title"), f"guide[{slug}].title"),
        "description": optional_string(raw_guide.get("description"), f"guide[{slug}].description"),
        "status": require_status(raw_guide.get("status", "draft"), GUIDE_STATUSES, f"guide[{slug}].status"),
    }

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
    repo_root: Path = REPO_ROOT,
    replace_covers: bool = False,
) -> ImportSummary:
    manifest_path = manifest_path.resolve()
    manifest = require_mapping(json.loads(manifest_path.read_text()), "manifest")
    summary = ImportSummary()

    for index, raw_place in enumerate(require_list(manifest.get("places", []), "manifest.places")):
        place = upsert_place(session, require_mapping(raw_place, f"manifest.places[{index}]"), summary)
        import_place_icon(
            session,
            manifest_path,
            repo_root,
            place,
            raw_place,
            summary,
            replace_covers=replace_covers,
        )

    for index, raw_guide in enumerate(require_list(manifest.get("guides", []), "manifest.guides")):
        guide_data = require_mapping(raw_guide, f"manifest.guides[{index}]")
        guide = upsert_guide(session, guide_data, summary)
        replace_guide_places(session, guide, guide_data.get("places", []), summary)

    session.commit()
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import city content into the local PhotoMap database.")
    parser.add_argument("manifest", type=Path, help="Path to a city content JSON manifest.")
    parser.add_argument(
        "--replace-covers",
        action="store_true",
        help="Import a new approved cover photo even when a place already has cover_photo_id.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    create_db_and_tables()
    with Session(engine) as session:
        summary = import_city_manifest(args.manifest, session=session, replace_covers=args.replace_covers)

    print(
        "Imported content: "
        f"{summary.places_created} places created, "
        f"{summary.places_updated} places updated, "
        f"{summary.icons_imported} icons imported, "
        f"{summary.guides_created} guides created, "
        f"{summary.guides_updated} guides updated, "
        f"{summary.guide_places} guide-place links."
    )


if __name__ == "__main__":
    main()
