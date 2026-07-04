from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.schemas.moderation import AdminModerationCounts
from app.services.moderation_counts import get_admin_moderation_counts

router = APIRouter(
    prefix="/api/admin/moderation", tags=["admin moderation"], dependencies=[Depends(require_admin_token)]
)


@router.get("/counts", response_model=AdminModerationCounts)
def moderation_counts(session: Session = Depends(get_session)) -> AdminModerationCounts:
    return get_admin_moderation_counts(session)
