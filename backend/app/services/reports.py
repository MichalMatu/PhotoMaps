from fastapi import HTTPException

REPORT_TARGET_TYPES = {"place", "photo", "memory", "guide"}
REPORT_STATUSES = {"open", "closed"}


def ensure_report_target_type(target_type: str) -> None:
    if target_type not in REPORT_TARGET_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported report target type")


def ensure_report_status(status: str) -> None:
    if status not in REPORT_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported report status")
