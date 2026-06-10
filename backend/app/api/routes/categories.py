from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.category import Category
from app.schemas.category import CategoryRead

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(session: Session = Depends(get_session)) -> list[Category]:
    statement = select(Category).where(Category.status == "active").order_by(Category.sort_order, Category.label)
    return list(session.exec(statement).all())
