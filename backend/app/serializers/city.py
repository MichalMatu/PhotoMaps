from app.models.city import City
from app.schemas.city import CityRead


def city_to_read(city: City) -> CityRead:
    return CityRead(
        id=city.id,
        name=city.name,
        lat=city.lat,
        lon=city.lon,
        default_zoom=city.default_zoom,
        sort_order=city.sort_order,
        status=city.status,
    )
