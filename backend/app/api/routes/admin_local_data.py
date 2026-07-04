from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.schemas.local_data import LocalDataCleanupRead, LocalDataDiagnosticsRead
from app.serializers.local_data import local_data_cleanup_to_read, local_data_diagnostics_to_read
from app.services.orphan_media_cleanup import cleanup_orphan_media_report, run_configured_local_data_diagnostics

router = APIRouter(
    prefix="/api/admin/local-data", tags=["admin local data"], dependencies=[Depends(require_admin_token)]
)


@router.get("/diagnostics", response_model=LocalDataDiagnosticsRead)
def get_local_data_diagnostics(session: Session = Depends(get_session)) -> LocalDataDiagnosticsRead:
    return local_data_diagnostics_to_read(run_configured_local_data_diagnostics(session))


@router.post("/orphan-media-cleanup", response_model=LocalDataCleanupRead)
def cleanup_orphan_media(session: Session = Depends(get_session)) -> LocalDataCleanupRead:
    return local_data_cleanup_to_read(cleanup_orphan_media_report(session, apply_changes=True))
