from sqlmodel import Session, select

from app.models.guide import Guide, PlaceGuide
from app.models.report import Report


def delete_guide_permanently(guide: Guide, session: Session) -> None:
    for row in session.exec(select(PlaceGuide).where(PlaceGuide.guide_id == guide.id)).all():
        session.delete(row)
    for report in session.exec(
        select(Report).where(Report.target_type == "guide").where(Report.target_id == guide.id)
    ).all():
        session.delete(report)

    session.delete(guide)
    session.commit()
