from sqlmodel import Field, SQLModel


class Category(SQLModel, table=True):
    id: str = Field(primary_key=True)
    label: str
    description: str | None = None
    icon: str | None = None
    sort_order: int = 0
    status: str = Field(default="active", index=True)
