from pathlib import Path

from app.models.photo import Photo
from app.services.media import images


def public_photo_image_url(place_id: str, photo_id: str) -> str:
    return f"/api/places/{place_id}/photos/{photo_id}/media/image"


def public_photo_image_url_for(photo: Photo) -> str:
    return public_photo_image_url(photo.place_id, photo.id)


def private_photo_image_path(photo: Photo) -> Path:
    return images.storage_path(images.PRIVATE_STORAGE_DIR, photo.original_path)
