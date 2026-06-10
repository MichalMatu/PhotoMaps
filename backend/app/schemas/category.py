from sqlmodel import SQLModel


class CategoryCreate(SQLModel):
    id: str
    label: str
    description: str | None = None
    icon: str | None = None
    sort_order: int = 0
    status: str = "active"


class CategoryUpdate(SQLModel):
    label: str | None = None
    description: str | None = None
    icon: str | None = None
    sort_order: int | None = None
    status: str | None = None


class CategoryRead(SQLModel):
    id: str
    label: str
    description: str | None
    icon: str | None
    sort_order: int
    status: str
