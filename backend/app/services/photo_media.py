from mimetypes import guess_type
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from app.models.photo import Photo
from app.services.media import images

IMAGE_MEDIA_TYPES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


def public_photo_image_url(place_id: str, photo_id: str) -> str:
    return f"/api/places/{place_id}/photos/{photo_id}/media/image"


def public_photo_image_url_for(photo: Photo) -> str:
    return public_photo_image_url(photo.place_id, photo.id)


def private_photo_image_path(photo: Photo) -> Path:
    return images.storage_path(images.PRIVATE_STORAGE_DIR, photo.original_path)


def photo_image_media_type(path: Path) -> str:
    guessed_type = guess_type(path.name)[0]
    if guessed_type in IMAGE_MEDIA_TYPES.values():
        return guessed_type

    try:
        with Image.open(path, formats=images.SUPPORTED_IMAGE_FORMATS) as image:
            return IMAGE_MEDIA_TYPES.get(image.format, "application/octet-stream")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        return "application/octet-stream"
