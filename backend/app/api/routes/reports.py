from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.session import get_session
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportRead
from app.services.reports import ensure_report_target_exists, ensure_report_target_type

router = APIRouter(prefix="/api/reports", tags=["reports"])


def report_to_read(report: Report) -> ReportRead:
    return ReportRead(
        id=report.id,
        target_type=report.target_type,
        target_id=report.target_id,
        reason=report.reason,
        message=report.message,
        status=report.status,
        created_at=report.created_at,
    )


@router.post("", response_model=ReportRead, status_code=201)
def create_report(payload: ReportCreate, session: Session = Depends(get_session)) -> ReportRead:
    ensure_report_target_type(payload.target_type)
    ensure_report_target_exists(session, payload.target_type, payload.target_id)
    report = Report.model_validate(payload)
    session.add(report)
    session.commit()
    session.refresh(report)
    return report_to_read(report)
