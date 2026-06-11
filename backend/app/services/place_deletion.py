from sqlmodel import Session, select

from app.models.guide import PlaceGuide
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place, PlaceCategory
from app.models.report import Report
from app.services.media.images import delete_stored_image


def delete_place_permanently(place: Place, session: Session) -> None:
    photos = list(session.exec(select(Photo).where(Photo.place_id == place.id)).all())
    memories = list(session.exec(select(Memory).where(Memory.place_id == place.id)).all())
    media_paths = [(photo.original_path, photo.public_path, photo.thumb_path) for photo in photos] + [
        (memory.original_path, memory.public_path, memory.thumb_path) for memory in memories
    ]

    photo_ids = [photo.id for photo in photos]
    memory_ids = [memory.id for memory in memories]

    for report in reports_for_deleted_place(session, place.id, photo_ids, memory_ids):
        session.delete(report)
    for row in session.exec(select(PlaceCategory).where(PlaceCategory.place_id == place.id)).all():
        session.delete(row)
    for row in session.exec(select(PlaceGuide).where(PlaceGuide.place_id == place.id)).all():
        session.delete(row)
    for photo in photos:
        session.delete(photo)
    for memory in memories:
        session.delete(memory)

    session.delete(place)
    session.commit()

    for original_path, public_path, thumb_path in media_paths:
        delete_stored_image(original_path, public_path, thumb_path)


def reports_for_deleted_place(
    session: Session,
    place_id: str,
    photo_ids: list[str],
    memory_ids: list[str],
) -> list[Report]:
    reports = list(
        session.exec(select(Report).where(Report.target_type == "place").where(Report.target_id == place_id)).all()
    )
    if photo_ids:
        reports.extend(
            session.exec(
                select(Report).where(Report.target_type == "photo").where(Report.target_id.in_(photo_ids))
            ).all()
        )
    if memory_ids:
        reports.extend(
            session.exec(
                select(Report).where(Report.target_type == "memory").where(Report.target_id.in_(memory_ids))
            ).all()
        )
    return reports
