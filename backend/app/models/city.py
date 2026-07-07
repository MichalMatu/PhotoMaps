from sqlmodel import Field, SQLModel


class City(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    region: str = Field(default="Dolnośląskie", nullable=False)
    lat: float
    lon: float
    default_zoom: int = 13
    sort_order: int = 0
    status: str = Field(default="active", index=True)
