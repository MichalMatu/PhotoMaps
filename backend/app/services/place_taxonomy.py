from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.category import Category
from app.models.place import PlaceCategory


def normalize_category_ids(category_ids: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for category_id in category_ids:
        stripped = category_id.strip()
        if not stripped or stripped in seen:
            continue
        normalized.append(stripped)
        seen.add(stripped)
    return normalized


def ensure_active_categories(session: Session, category_ids: list[str]) -> list[str]:
    normalized_ids, invalid_ids = active_category_validation(session, category_ids)
    if invalid_ids:
        raise HTTPException(status_code=422, detail=f"Categories must be active: {', '.join(invalid_ids)}")
    return normalized_ids


def active_category_validation(session: Session, category_ids: list[str]) -> tuple[list[str], list[str]]:
    normalized_ids = normalize_category_ids(category_ids)
    if not normalized_ids:
        return [], []

    categories = session.exec(select(Category).where(Category.id.in_(normalized_ids))).all()
    active_ids = {category.id for category in categories if category.status == "active"}
    invalid_ids = [category_id for category_id in normalized_ids if category_id not in active_ids]
    return normalized_ids, invalid_ids


def category_ids_by_place_id(session: Session, place_ids: list[str]) -> dict[str, list[str]]:
    if not place_ids:
        return {}

    result = {place_id: [] for place_id in place_ids}
    rows = session.exec(
        select(PlaceCategory)
        .where(PlaceCategory.place_id.in_(place_ids))
        .order_by(PlaceCategory.sort_order, PlaceCategory.category_id)
    ).all()
    for row in rows:
        result.setdefault(row.place_id, []).append(row.category_id)
    return result


def categories_by_place_id(session: Session, place_ids: list[str]) -> dict[str, list[Category]]:
    category_ids_by_place = category_ids_by_place_id(session, place_ids)
    category_ids = sorted({category_id for ids in category_ids_by_place.values() for category_id in ids})
    categories_by_id: dict[str, Category] = {}
    if category_ids:
        categories = session.exec(select(Category).where(Category.id.in_(category_ids))).all()
        categories_by_id = {category.id: category for category in categories}

    return {
        place_id: [categories_by_id[category_id] for category_id in ids if category_id in categories_by_id]
        for place_id, ids in category_ids_by_place.items()
    }


def replace_place_categories(session: Session, place_id: str, category_ids: list[str]) -> None:
    normalized_ids = ensure_active_categories(session, category_ids)
    for existing in session.exec(select(PlaceCategory).where(PlaceCategory.place_id == place_id)).all():
        session.delete(existing)
    session.flush()

    for sort_order, category_id in enumerate(normalized_ids):
        session.add(PlaceCategory(place_id=place_id, category_id=category_id, sort_order=sort_order))
