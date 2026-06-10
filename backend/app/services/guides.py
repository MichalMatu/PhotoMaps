from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.guide import Guide

GUIDE_STATUSES = {"draft", "published", "archived"}


def ensure_guide_status(status: str) -> None:
    if status not in GUIDE_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported guide status")


def ensure_guide_slug_available(session: Session, slug: str, guide_id: str | None = None) -> None:
    statement = select(Guide).where(Guide.slug == slug)
    existing = session.exec(statement).first()
    if existing is not None and existing.id != guide_id:
        raise HTTPException(status_code=409, detail="Guide slug already exists")
