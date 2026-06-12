from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.city import City
from app.models.place import Place
from app.schemas.city import CityCreate, CityRead, CityUpdate
from app.serializers.city import city_to_read

router = APIRouter(prefix="/api/admin/cities", tags=["admin cities"], dependencies=[Depends(require_admin_token)])

ALLOWED_CITY_STATUSES = {"active", "archived"}


def ensure_city_status(status: str) -> None:
    if status not in ALLOWED_CITY_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported city status")


def ensure_city_id_available(session: Session, city_id: str) -> None:
    if session.get(City, city_id) is not None:
        raise HTTPException(status_code=409, detail="City already exists")


def city_is_used(session: Session, city_id: str) -> bool:
    statement = select(Place).where(Place.city_id == city_id).limit(1)
    return session.exec(statement).first() is not None


@router.get("", response_model=list[CityRead])
def list_admin_cities(session: Session = Depends(get_session)) -> list[CityRead]:
    statement = select(City).order_by(City.sort_order, City.name)
    return [city_to_read(city) for city in session.exec(statement).all()]


@router.post("", response_model=CityRead, status_code=201)
def create_city(payload: CityCreate, session: Session = Depends(get_session)) -> CityRead:
    ensure_city_status(payload.status)
    ensure_city_id_available(session, payload.id)

    city = City.model_validate(payload)
    session.add(city)
    session.commit()
    session.refresh(city)
    return city_to_read(city)


@router.patch("/{city_id}", response_model=CityRead)
def update_city(
    city_id: str,
    payload: CityUpdate,
    session: Session = Depends(get_session),
) -> CityRead:
    city = session.get(City, city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        ensure_city_status(data["status"])

    for key, value in data.items():
        setattr(city, key, value)

    session.add(city)
    session.commit()
    session.refresh(city)
    return city_to_read(city)


@router.delete(
    "/{city_id}",
    response_model=None,
    responses={200: {"model": CityRead}, 204: {"description": "Deleted"}},
)
def delete_city(city_id: str, force: bool = False, session: Session = Depends(get_session)) -> CityRead | Response:
    city = session.get(City, city_id)
    if city is None:
        raise HTTPException(status_code=404, detail="City not found")

    if force:
        if city_is_used(session, city.id):
            raise HTTPException(status_code=409, detail="City is used by places")
        session.delete(city)
        session.commit()
        return Response(status_code=204)

    city.status = "archived"
    session.add(city)
    session.commit()
    session.refresh(city)
    return city_to_read(city)
