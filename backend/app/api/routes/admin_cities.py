from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.city import City
from app.schemas.city import CityRead
from app.serializers.city import city_to_read

router = APIRouter(prefix="/api/admin/cities", tags=["admin cities"], dependencies=[Depends(require_admin_token)])


@router.get("", response_model=list[CityRead])
def list_admin_cities(session: Session = Depends(get_session)) -> list[CityRead]:
    statement = select(City).order_by(City.sort_order, City.name)
    return [city_to_read(city) for city in session.exec(statement).all()]
