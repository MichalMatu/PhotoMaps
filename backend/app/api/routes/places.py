from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.db.session import get_session
from app.models.place import Place
from app.schemas.place import PlaceDetailRead, PlaceMapRead, PlaceRead
from app.serializers.place import place_to_detail_read, place_to_read
from app.services.app_config import get_place_custom_field_definitions
from app.services.place_taxonomy import category_ids_by_place_id
from app.services.places import list_public_map_places, public_places_statement, sort_places_for_public_map

router = APIRouter(prefix="/api/places", tags=["places"])


@router.get("", response_model=list[PlaceRead])
def list_places(session: Session = Depends(get_session)) -> list[PlaceRead]:
    places = sort_places_for_public_map(list(session.exec(public_places_statement()).all()))
    category_ids_by_place = category_ids_by_place_id(session, [place.id for place in places])
    custom_field_definitions = get_place_custom_field_definitions(session)
    return [place_to_read(place, category_ids_by_place.get(place.id, []), custom_field_definitions) for place in places]


@router.get("/map", response_model=list[PlaceMapRead])
def list_map_places(
    city_id: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
) -> list[PlaceMapRead]:
    return list_public_map_places(session, city_id)


@router.get("/{id_or_slug}", response_model=PlaceDetailRead)
def get_place(id_or_slug: str, session: Session = Depends(get_session)) -> PlaceDetailRead:
    statement = public_places_statement().where((Place.id == id_or_slug) | (Place.slug == id_or_slug))
    place = session.exec(statement).first()
    if place is None:
        raise HTTPException(status_code=404, detail="Place not found")
    return place_to_detail_read(
        place,
        category_ids_by_place_id(session, [place.id]).get(place.id, []),
        get_place_custom_field_definitions(session),
    )
