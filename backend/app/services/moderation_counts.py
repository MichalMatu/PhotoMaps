from sqlalchemy import func
from sqlmodel import Session, select

from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.models.report import Report
from app.schemas.moderation import AdminModerationCounts, ReportStatusCounts, ReviewStatusCounts

REVIEW_STATUSES = ("pending", "approved", "rejected")
REPORT_STATUSES = ("open", "closed")


def _review_counts(rows: list[tuple[str, int]]) -> ReviewStatusCounts:
    counts = {status: 0 for status in REVIEW_STATUSES}
    total = 0
    for status, count in rows:
        total += count
        if status in counts:
            counts[status] = count
    return ReviewStatusCounts(all=total, **counts)


def _report_counts(rows: list[tuple[str, int]]) -> ReportStatusCounts:
    counts = {status: 0 for status in REPORT_STATUSES}
    total = 0
    for status, count in rows:
        total += count
        if status in counts:
            counts[status] = count
    return ReportStatusCounts(all=total, **counts)


def get_admin_moderation_counts(session: Session) -> AdminModerationCounts:
    photo_rows = session.exec(
        select(Photo.status, func.count(Photo.id)).join(Place, Photo.place_id == Place.id).group_by(Photo.status)
    ).all()
    memory_rows = session.exec(
        select(Memory.status, func.count(Memory.id)).join(Place, Memory.place_id == Place.id).group_by(Memory.status)
    ).all()
    report_rows = session.exec(select(Report.status, func.count(Report.id)).group_by(Report.status)).all()

    return AdminModerationCounts(
        photos=_review_counts(photo_rows),
        memories=_review_counts(memory_rows),
        reports=_report_counts(report_rows),
    )
