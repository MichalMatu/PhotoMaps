from fastapi import APIRouter, Depends, Response
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.schemas.place import PlaceAdminRead, PlaceCreate, PlaceUpdate
from app.services.places import (
    create_admin_place,
    delete_admin_place,
    update_admin_place,
)
from app.services.places import (
    list_admin_places as list_admin_places_service,
)

router = APIRouter(prefix="/api/admin/places", tags=["admin places"], dependencies=[Depends(require_admin_token)])


@router.get("", response_model=list[PlaceAdminRead])
def list_admin_places(session: Session = Depends(get_session)) -> list[PlaceAdminRead]:
    return list_admin_places_service(session)


@router.post("", response_model=PlaceAdminRead, status_code=201)
def create_place(payload: PlaceCreate, session: Session = Depends(get_session)) -> PlaceAdminRead:
    return create_admin_place(session, payload)


@router.patch("/{place_id}", response_model=PlaceAdminRead)
def update_place(
    place_id: str,
    payload: PlaceUpdate,
    session: Session = Depends(get_session),
) -> PlaceAdminRead:
    return update_admin_place(session, place_id, payload)


@router.delete(
    "/{place_id}",
    response_model=None,
    responses={200: {"model": PlaceAdminRead}, 204: {"description": "Deleted"}},
)
def delete_place(
    place_id: str, force: bool = False, session: Session = Depends(get_session)
) -> PlaceAdminRead | Response:
    place = delete_admin_place(session, place_id, force=force)
    if place is None:
        return Response(status_code=204)
    return place
