from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.category import Category
from app.models.place import Place
from app.schemas.place import PlaceCreate, PlaceRead, PlaceUpdate
from app.api.routes.places import place_to_read

router = APIRouter(prefix="/api/admin/places", tags=["admin places"], dependencies=[Depends(require_admin_token)])

ALLOWED_STATUSES = {"draft", "published", "archived"}


def ensure_status(status: str) -> None:
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported place status")


def ensure_slug_available(session: Session, slug: str, place_id: str | None = None) -> None:
    statement = select(Place).where(Place.slug == slug)
    existing = session.exec(statement).first()
    if existing is not None and existing.id != place_id:
        raise HTTPException(status_code=409, detail="Slug already exists")


def ensure_active_category(session: Session, category_id: str) -> None:
    category = session.get(Category, category_id)
    if category is None or category.status != "active":
        raise HTTPException(status_code=422, detail="Category must be active")


@router.get("", response_model=list[PlaceRead])
def list_admin_places(session: Session = Depends(get_session)) -> list[PlaceRead]:
    statement = select(Place).order_by(Place.created_at.desc())
    return [place_to_read(place) for place in session.exec(statement).all()]


@router.post("", response_model=PlaceRead, status_code=201)
def create_place(payload: PlaceCreate, session: Session = Depends(get_session)) -> PlaceRead:
    ensure_status(payload.status)
    ensure_slug_available(session, payload.slug)
    if payload.category_id is not None:
        ensure_active_category(session, payload.category_id)
    place = Place.model_validate(payload)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place_to_read(place)


@router.patch("/{place_id}", response_model=PlaceRead)
def update_place(
    place_id: str,
    payload: PlaceUpdate,
    session: Session = Depends(get_session),
) -> PlaceRead:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        ensure_status(data["status"])
    if "slug" in data and data["slug"] is not None:
        ensure_slug_available(session, data["slug"], place.id)
    if "category_id" in data and data["category_id"] is not None and data["category_id"] != place.category_id:
        ensure_active_category(session, data["category_id"])

    for key, value in data.items():
        setattr(place, key, value)
    place.updated_at = datetime.now(timezone.utc)

    session.add(place)
    session.commit()
    session.refresh(place)
    return place_to_read(place)


@router.delete("/{place_id}", response_model=PlaceRead)
def archive_place(place_id: str, session: Session = Depends(get_session)) -> PlaceRead:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    place.status = "archived"
    place.updated_at = datetime.now(timezone.utc)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place_to_read(place)
