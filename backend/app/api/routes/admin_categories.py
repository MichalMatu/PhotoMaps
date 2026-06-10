from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.category import Category
from app.models.place import Place
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/api/admin/categories", tags=["admin categories"])

ALLOWED_CATEGORY_STATUSES = {"active", "archived"}


def ensure_category_status(status: str) -> None:
    if status not in ALLOWED_CATEGORY_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported category status")


def ensure_category_id_available(session: Session, category_id: str) -> None:
    if session.get(Category, category_id) is not None:
        raise HTTPException(status_code=409, detail="Category already exists")


def category_is_used(session: Session, category_id: str) -> bool:
    statement = select(Place).where(Place.category_id == category_id).limit(1)
    return session.exec(statement).first() is not None


@router.get("", response_model=list[CategoryRead])
def list_admin_categories(session: Session = Depends(get_session)) -> list[Category]:
    statement = select(Category).order_by(Category.status, Category.sort_order, Category.label)
    return list(session.exec(statement).all())


@router.post("", response_model=CategoryRead, status_code=201)
def create_category(payload: CategoryCreate, session: Session = Depends(get_session)) -> Category:
    ensure_category_status(payload.status)
    ensure_category_id_available(session, payload.id)

    category = Category.model_validate(payload)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: str,
    payload: CategoryUpdate,
    session: Session = Depends(get_session),
) -> Category:
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


@router.delete(
    "/{category_id}",
    response_model=None,
    responses={200: {"model": CategoryRead}, 204: {"description": "Deleted"}},
)
def delete_category(category_id: str, force: bool = False, session: Session = Depends(get_session)) -> Category | Response:
    category = session.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    if force:
        if category_is_used(session, category.id):
            raise HTTPException(status_code=409, detail="Category is used by places")
        session.delete(category)
        session.commit()
        return Response(status_code=204)

    category.status = "archived"
    session.add(category)
    session.commit()
    session.refresh(category)
    return category
