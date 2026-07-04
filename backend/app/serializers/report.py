from app.models.report import Report
from app.schemas.report import ReportRead


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
