from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.schemas.guide import (
    GuideCreate,
    GuideDetailRead,
    GuidePlaceCreate,
    GuidePlaceOrderUpdate,
    GuideRead,
    GuideUpdate,
)
from app.services.guides import (
    add_admin_place_to_guide,
    create_admin_guide,
    delete_admin_guide,
    get_admin_guide_detail,
    remove_admin_place_from_guide,
    reorder_admin_guide_places,
    update_admin_guide,
)
from app.services.guides import (
    list_admin_guides as list_admin_guides_service,
)

router = APIRouter(prefix="/api/admin/guides", tags=["admin guides"], dependencies=[Depends(require_admin_token)])


@router.get("", response_model=list[GuideRead])
def list_admin_guides(session: Session = Depends(get_session)) -> list[GuideRead]:
    return list_admin_guides_service(session)


@router.get("/{guide_id}", response_model=GuideDetailRead)
def get_admin_guide(guide_id: str, session: Session = Depends(get_session)) -> GuideDetailRead:
    return get_admin_guide_detail(session, guide_id)


@router.post("", response_model=GuideRead, status_code=201)
def create_guide(payload: GuideCreate, session: Session = Depends(get_session)) -> GuideRead:
    return create_admin_guide(session, payload)


@router.patch("/{guide_id}", response_model=GuideRead)
def update_guide(guide_id: str, payload: GuideUpdate, session: Session = Depends(get_session)) -> GuideRead:
    return update_admin_guide(session, guide_id, payload)


@router.delete("/{guide_id}", status_code=204)
def delete_guide(guide_id: str, session: Session = Depends(get_session)) -> None:
    delete_admin_guide(session, guide_id)
    return None


@router.post("/{guide_id}/places", response_model=GuideDetailRead)
def add_place_to_guide(
    guide_id: str,
    payload: GuidePlaceCreate,
    session: Session = Depends(get_session),
) -> GuideDetailRead:
    return add_admin_place_to_guide(session, guide_id, payload)


@router.put("/{guide_id}/places/order", response_model=GuideDetailRead)
def reorder_guide_places(
    guide_id: str,
    payload: GuidePlaceOrderUpdate,
    session: Session = Depends(get_session),
) -> GuideDetailRead:
    return reorder_admin_guide_places(session, guide_id, payload)


@router.delete("/{guide_id}/places/{place_id}", response_model=GuideDetailRead)
def remove_place_from_guide(
    guide_id: str,
    place_id: str,
    session: Session = Depends(get_session),
) -> GuideDetailRead:
    return remove_admin_place_from_guide(session, guide_id, place_id)
