from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.city import City
from app.models.guide import Guide
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.services.public_guides import public_guide_has_visible_places

REPORT_TARGET_TYPES = {"place", "photo", "memory", "guide"}
REPORT_STATUSES = {"open", "closed"}


def ensure_report_target_type(target_type: str) -> None:
    if target_type not in REPORT_TARGET_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported report target type")


def ensure_report_status(status: str) -> None:
    if status not in REPORT_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported report status")


def ensure_public_report_target(session: Session, target_type: str, target_id: str) -> None:
    if target_type == "place":
        statement = (
            select(Place)
            .join(City, City.id == Place.city_id)
            .where(Place.id == target_id)
            .where(Place.status == "published", City.status == "active")
        )
        if session.exec(statement).first() is None:
            raise HTTPException(status_code=404, detail="Place not found")
        return

    if target_type == "guide":
        guide = session.get(Guide, target_id)
        if guide is None or guide.status != "published" or not public_guide_has_visible_places(session, guide.id):
            raise HTTPException(status_code=404, detail="Guide not found")
        return

    if target_type == "photo":
        statement = (
            select(Photo)
            .join(Place, Place.id == Photo.place_id)
            .join(City, City.id == Place.city_id)
            .where(Photo.id == target_id)
            .where(Photo.status == "approved")
            .where(Photo.public_path.is_not(None), Photo.thumb_path.is_not(None))
            .where(Place.status == "published", City.status == "active")
        )
        if session.exec(statement).first() is None:
            raise HTTPException(status_code=404, detail="Photo not found")
        return

    if target_type == "memory":
        statement = (
            select(Memory)
            .join(Place, Place.id == Memory.place_id)
            .join(City, City.id == Place.city_id)
            .where(Memory.id == target_id)
            .where(Memory.status == "approved")
            .where(Memory.public_path.is_not(None), Memory.thumb_path.is_not(None))
            .where(Place.status == "published", City.status == "active")
        )
        if session.exec(statement).first() is None:
            raise HTTPException(status_code=404, detail="Memory not found")
