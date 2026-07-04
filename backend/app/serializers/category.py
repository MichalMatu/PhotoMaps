from app.models.category import Category
from app.schemas.category import CategoryRead


def category_to_read(category: Category) -> CategoryRead:
    return CategoryRead(
        id=category.id,
        label=category.label,
        description=category.description,
        icon=category.icon,
        sort_order=category.sort_order,
        status=category.status,
    )
