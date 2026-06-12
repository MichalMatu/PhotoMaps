from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.report import Report
from app.schemas.report import ReportRead, ReportUpdate
from app.serializers.report import report_to_read
from app.services.reports import ensure_report_status

router = APIRouter(prefix="/api/admin/reports", tags=["admin reports"], dependencies=[Depends(require_admin_token)])


@router.get("", response_model=list[ReportRead])
def list_admin_reports(
    status: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[ReportRead]:
    if status is not None:
        ensure_report_status(status)

    statement = select(Report).order_by(Report.created_at.desc())
    if status is not None:
        statement = statement.where(Report.status == status)
    return [report_to_read(report) for report in session.exec(statement).all()]


@router.patch("/{report_id}", response_model=ReportRead)
def update_report(
    report_id: str,
    payload: ReportUpdate,
    session: Session = Depends(get_session),
) -> ReportRead:
    report = session.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        ensure_report_status(data["status"])
    if "message" in data:
        report.message = data["message"]
    if "status" in data and data["status"] is not None:
        report.status = data["status"]

    session.add(report)
    session.commit()
    session.refresh(report)
    return report_to_read(report)


@router.delete("/{report_id}", status_code=204)
def delete_report(report_id: str, session: Session = Depends(get_session)) -> None:
    report = session.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    session.delete(report)
    session.commit()
    return None
