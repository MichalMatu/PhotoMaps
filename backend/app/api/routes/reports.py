from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.session import get_session
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportRead
from app.serializers.report import report_to_read
from app.services.reports import ensure_public_report_target, ensure_report_target_type

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=201)
def create_report(payload: ReportCreate, session: Session = Depends(get_session)) -> ReportRead:
    ensure_report_target_type(payload.target_type)
    ensure_public_report_target(session, payload.target_type, payload.target_id)
    report = Report.model_validate(payload)
    session.add(report)
    session.commit()
    session.refresh(report)
    return report_to_read(report)
