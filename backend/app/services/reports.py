from fastapi import HTTPException
from sqlmodel import Session

from app.models.guide import Guide
from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place

REPORT_TARGET_TYPES = {"place", "photo", "memory", "guide"}
REPORT_STATUSES = {"open", "closed"}


def ensure_report_target_type(target_type: str) -> None:
    if target_type not in REPORT_TARGET_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported report target type")


def ensure_report_status(status: str) -> None:
    if status not in REPORT_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported report status")


def ensure_report_target_exists(session: Session, target_type: str, target_id: str) -> None:
    model_by_target = {
        "guide": Guide,
        "memory": Memory,
        "photo": Photo,
        "place": Place,
    }
    model = model_by_target[target_type]
    if session.get(model, target_id) is None:
        raise HTTPException(status_code=404, detail=f"{target_type.capitalize()} not found")
