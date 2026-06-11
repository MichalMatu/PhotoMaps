from sqlmodel import SQLModel


class CityRead(SQLModel):
    id: str
    name: str
    lat: float
    lon: float
    default_zoom: int
    sort_order: int
    status: str
