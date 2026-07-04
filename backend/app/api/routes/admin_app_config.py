from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.schemas.app_config import AppConfigRead, AppConfigUpdate
from app.services.app_config import get_app_config, update_app_config

router = APIRouter(
    prefix="/api/admin/app-config", tags=["admin app-config"], dependencies=[Depends(require_admin_token)]
)


@router.get("", response_model=AppConfigRead)
def read_admin_app_config(session: Session = Depends(get_session)) -> AppConfigRead:
    return get_app_config(session)


@router.put("", response_model=AppConfigRead)
def replace_admin_app_config(
    payload: AppConfigUpdate,
    session: Session = Depends(get_session),
) -> AppConfigRead:
    try:
        return update_app_config(payload, session)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
