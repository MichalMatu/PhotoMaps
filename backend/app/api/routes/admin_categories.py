from fastapi import APIRouter, Depends, Response
from sqlmodel import Session

from app.api.admin_auth import require_admin_token
from app.db.session import get_session
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.services.categories import (
    create_admin_category,
    delete_admin_category,
    update_admin_category,
)
from app.services.categories import (
    list_admin_categories as list_admin_categories_service,
)

router = APIRouter(
    prefix="/api/admin/categories", tags=["admin categories"], dependencies=[Depends(require_admin_token)]
)


@router.get("", response_model=list[CategoryRead])
def list_admin_categories(session: Session = Depends(get_session)) -> list[Category]:
    return list_admin_categories_service(session)


@router.post("", response_model=CategoryRead, status_code=201)
def create_category(payload: CategoryCreate, session: Session = Depends(get_session)) -> Category:
    return create_admin_category(session, payload)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: str,
    payload: CategoryUpdate,
    session: Session = Depends(get_session),
) -> Category:
    return update_admin_category(session, category_id, payload)


@router.delete(
    "/{category_id}",
    response_model=None,
    responses={200: {"model": CategoryRead}, 204: {"description": "Deleted"}},
)
def delete_category(
    category_id: str, force: bool = False, session: Session = Depends(get_session)
) -> Category | Response:
    category = delete_admin_category(session, category_id, force=force)
    if category is None:
        return Response(status_code=204)
    return category
