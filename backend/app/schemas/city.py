from sqlmodel import SQLModel


class CityCreate(SQLModel):
    id: str
    name: str
    lat: float
    lon: float
    default_zoom: int = 13
    sort_order: int = 0
    status: str = "active"


class CityUpdate(SQLModel):
    name: str | None = None
    lat: float | None = None
    lon: float | None = None
    default_zoom: int | None = None
    sort_order: int | None = None
    status: str | None = None


class CityRead(SQLModel):
    id: str
    name: str
    lat: float
    lon: float
    default_zoom: int
    sort_order: int
    status: str
