from datetime import datetime

from sqlmodel import SQLModel

from app.schemas.category import CategoryRead
from app.schemas.city import CityRead
from app.schemas.content import ContentBlock
from app.schemas.photo import PhotoDetailRead


class PublicDiscoveryRead(SQLModel):
    product_name: str
    description: str
    llms_txt_path: str
    sitemap_path: str
    cities_path: str
    city_places_path_template: str
    place_detail_path_template: str


class PublicPlaceIndexRead(SQLModel):
    id: str
    city_id: str
    slug: str
    title: str
    description: str | None
    category_ids: list[str]
    categories: list[CategoryRead]
    city: CityRead
    lat: float
    lon: float
    weight: float
    custom_fields: dict
    photo_count: int
    memory_count: int
    score: float
    page_path: str
    api_path: str
    created_at: datetime
    updated_at: datetime


class PublicPlaceDetailRead(PublicPlaceIndexRead):
    article_blocks: list[ContentBlock]
    photos: list[PhotoDetailRead]
    cover_photo: PhotoDetailRead | None
