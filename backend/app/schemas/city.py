from sqlmodel import SQLModel

from app.schemas.contract_types import CityStatus


class CityCreate(SQLModel):
    id: str
    name: str
    region: str
    lat: float
    lon: float
    default_zoom: int = 13
    sort_order: int = 0
    status: CityStatus = "active"


class CityUpdate(SQLModel):
    name: str | None = None
    region: str | None = None
    lat: float | None = None
    lon: float | None = None
    default_zoom: int | None = None
    sort_order: int | None = None
    status: CityStatus | None = None


class CityRead(SQLModel):
    id: str
    name: str
    region: str
    lat: float
    lon: float
    default_zoom: int
    sort_order: int
    status: CityStatus
