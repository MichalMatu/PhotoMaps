from sqlmodel import SQLModel


class CategoryRead(SQLModel):
    id: str
    label: str
    description: str | None
    icon: str | None
    sort_order: int
