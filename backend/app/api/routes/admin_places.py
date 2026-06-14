from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.photo import Photo
from app.models.place import Place
from app.schemas.place import PlaceCreate, PlaceRead, PlaceUpdate
from app.serializers.place import place_to_read
from app.services.cities import ensure_active_city
from app.services.place_deletion import delete_place_permanently
from app.services.place_taxonomy import category_ids_by_place_id, replace_place_categories
from app.services.places import ensure_place_status, ensure_slug_available

router = APIRouter(prefix="/api/admin/places", tags=["admin places"], dependencies=[Depends(require_admin_token)])


def ensure_cover_photo(session: Session, place_id: str, cover_photo_id: str | None) -> None:
    if cover_photo_id is None:
        return

    photo = session.get(Photo, cover_photo_id)
    if photo is None or photo.place_id != place_id:
        raise HTTPException(status_code=422, detail="Cover photo must belong to place")
    if photo.status != "approved":
        raise HTTPException(status_code=422, detail="Cover photo must be approved")


@router.get("", response_model=list[PlaceRead])
def list_admin_places(session: Session = Depends(get_session)) -> list[PlaceRead]:
    statement = select(Place).order_by(Place.created_at.desc())
    places = list(session.exec(statement).all())
    category_ids_by_place = category_ids_by_place_id(session, [place.id for place in places])
    return [place_to_read(place, category_ids_by_place.get(place.id, [])) for place in places]


@router.post("", response_model=PlaceRead, status_code=201)
def create_place(payload: PlaceCreate, session: Session = Depends(get_session)) -> PlaceRead:
    ensure_place_status(payload.status)
    ensure_slug_available(session, payload.slug)
    ensure_active_city(session, payload.city_id)
    place = Place.model_validate(payload.model_dump(exclude={"category_ids"}))
    session.add(place)
    session.flush()
    replace_place_categories(session, place.id, payload.category_ids)
    session.commit()
    session.refresh(place)
    return place_to_read(place, category_ids_by_place_id(session, [place.id]).get(place.id, []))


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
        ensure_place_status(data["status"])
    if "slug" in data and data["slug"] is not None:
        ensure_slug_available(session, data["slug"], place.id)
    if "city_id" in data and data["city_id"] is not None:
        ensure_active_city(session, data["city_id"])
    if "cover_photo_id" in data:
        ensure_cover_photo(session, place.id, data["cover_photo_id"])

    category_ids = data.pop("category_ids", None)

    for key, value in data.items():
        setattr(place, key, value)
    if category_ids is not None:
        replace_place_categories(session, place.id, category_ids)
    place.updated_at = datetime.now(UTC)

    session.add(place)
    session.commit()
    session.refresh(place)
    return place_to_read(place, category_ids_by_place_id(session, [place.id]).get(place.id, []))


@router.delete(
    "/{place_id}",
    response_model=None,
    responses={200: {"model": PlaceRead}, 204: {"description": "Deleted"}},
)
def delete_place(place_id: str, force: bool = False, session: Session = Depends(get_session)) -> PlaceRead | Response:
    place = session.get(Place, place_id)
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")

    if force:
        delete_place_permanently(place, session)
        return Response(status_code=204)

    place.status = "archived"
    place.updated_at = datetime.now(UTC)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place_to_read(place, category_ids_by_place_id(session, [place.id]).get(place.id, []))
