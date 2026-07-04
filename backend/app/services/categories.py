from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.category import Category
from app.models.place import PlaceCategory
from app.schemas.category import CategoryCreate, CategoryUpdate

CATEGORY_STATUSES = {"active", "archived"}


def ensure_category_status(status: str) -> None:
    if status not in CATEGORY_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported category status")


def ensure_category_id_available(session: Session, category_id: str) -> None:
    if session.get(Category, category_id) is not None:
        raise HTTPException(status_code=409, detail="Category already exists")


def category_is_used(session: Session, category_id: str) -> bool:
    statement = select(PlaceCategory).where(PlaceCategory.category_id == category_id).limit(1)
    return session.exec(statement).first() is not None


def list_admin_categories(session: Session) -> list[Category]:
    statement = select(Category).order_by(Category.status, Category.sort_order, Category.label)
    return list(session.exec(statement).all())


def create_admin_category(session: Session, payload: CategoryCreate) -> Category:
    ensure_category_status(payload.status)
    ensure_category_id_available(session, payload.id)

    category = Category.model_validate(payload)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def update_admin_category(session: Session, category_id: str, payload: CategoryUpdate) -> Category:
    category = session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        ensure_category_status(data["status"])

    for key, value in data.items():
        setattr(category, key, value)

    session.add(category)
    session.commit()
    session.refresh(category)
    return category


def delete_admin_category(session: Session, category_id: str, *, force: bool) -> Category | None:
    category = session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    if force:
        if category_is_used(session, category.id):
            raise HTTPException(status_code=409, detail="Category is used by places")
        session.delete(category)
        session.commit()
        return None

    category.status = "archived"
    session.add(category)
    session.commit()
    session.refresh(category)
    return category
