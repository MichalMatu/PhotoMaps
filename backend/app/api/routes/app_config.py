from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.session import get_session
from app.schemas.app_config import AppConfigRead
from app.services.app_config import get_app_config

router = APIRouter(prefix="/api/app-config", tags=["app-config"])


@router.get("", response_model=AppConfigRead)
def read_app_config(session: Session = Depends(get_session)) -> AppConfigRead:
    return get_app_config(session)
