from fastapi import APIRouter, Depends, Response
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.schemas.city import CityCreate, CityRead, CityUpdate
from app.serializers.city import city_to_read
from app.services.cities import (
    create_admin_city,
    delete_admin_city,
    update_admin_city,
)
from app.services.cities import (
    list_admin_cities as list_admin_cities_service,
)

router = APIRouter(prefix="/api/admin/cities", tags=["admin cities"], dependencies=[Depends(require_admin_token)])


@router.get("", response_model=list[CityRead])
def list_admin_cities(session: Session = Depends(get_session)) -> list[CityRead]:
    return [city_to_read(city) for city in list_admin_cities_service(session)]


@router.post("", response_model=CityRead, status_code=201)
def create_city(payload: CityCreate, session: Session = Depends(get_session)) -> CityRead:
    return city_to_read(create_admin_city(session, payload))


@router.patch("/{city_id}", response_model=CityRead)
def update_city(
    city_id: str,
    payload: CityUpdate,
    session: Session = Depends(get_session),
) -> CityRead:
    return city_to_read(update_admin_city(session, city_id, payload))


@router.delete(
    "/{city_id}",
    response_model=None,
    responses={200: {"model": CityRead}, 204: {"description": "Deleted"}},
)
def delete_city(city_id: str, force: bool = False, session: Session = Depends(get_session)) -> CityRead | Response:
    city = delete_admin_city(session, city_id, force=force)
    if city is None:
        return Response(status_code=204)
    return city_to_read(city)
