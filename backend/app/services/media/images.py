from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import PRIVATE_STORAGE_DIR, PUBLIC_STORAGE_DIR

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 24_000_000
PUBLIC_IMAGE_QUALITY = 88
PUBLIC_MAX_SIZE = (1800, 1800)
THUMB_SIZE = (520, 520)
MEDIA_KINDS = {"photos", "memories"}

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


@dataclass(frozen=True)
class StoredImage:
    original_path: str
    public_path: str
    thumb_path: str


def public_url(path: Path) -> str:
    relative_path = path.relative_to(PUBLIC_STORAGE_DIR)
    return f"/media/{relative_path.as_posix()}"


def private_reference(path: Path) -> str:
    return path.relative_to(PRIVATE_STORAGE_DIR).as_posix()


def storage_path(root: Path, relative_path: str) -> Path:
    resolved_root = root.resolve()
    resolved_path = (root / relative_path).resolve()
    if not resolved_path.is_relative_to(resolved_root):
        raise ValueError("Storage path escapes configured root")
    return resolved_path


def public_storage_path(public_url_path: str) -> Path:
    media_prefix = "/media/"
    if not public_url_path.startswith(media_prefix):
        raise ValueError("Unsupported public media URL")
    return storage_path(PUBLIC_STORAGE_DIR, public_url_path.removeprefix(media_prefix))


def delete_stored_image(original_path: str, public_path: str, thumb_path: str) -> None:
    paths = [
        storage_path(PRIVATE_STORAGE_DIR, original_path),
        public_storage_path(public_path),
        public_storage_path(thumb_path),
    ]

    for path in paths:
        path.unlink(missing_ok=True)


def original_suffix(filename: str | None) -> str:
    if not filename:
        return ".bin"
    suffix = Path(filename).suffix.lower()
    return suffix if suffix in {".jpg", ".jpeg", ".png", ".webp"} else ".bin"


def normalized_rgb(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    if image.mode in {"RGBA", "LA"}:
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.getchannel("A"))
        return background
    return image.convert("RGB")


def cleanup_paths(*paths: Path) -> None:
    for path in paths:
        path.unlink(missing_ok=True)


def ensure_media_kind(media_kind: str) -> None:
    if media_kind not in MEDIA_KINDS:
        raise ValueError("Unsupported media kind")


def ensure_image_size(image: Image.Image) -> None:
    width, height = image.size
    if width <= 0 or height <= 0:
        raise HTTPException(status_code=422, detail="Image dimensions are invalid")
    if width * height > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=413, detail="Image dimensions are too large")


async def store_uploaded_image(upload: UploadFile, place_id: str, media_kind: str) -> StoredImage:
    ensure_media_kind(media_kind)
    content = await upload.read()
    if not content:
        raise HTTPException(status_code=422, detail="Image file is empty")
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image file is too large")

    image_id = str(uuid4())
    private_dir = PRIVATE_STORAGE_DIR / media_kind / place_id
    public_dir = PUBLIC_STORAGE_DIR / media_kind / place_id
    private_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    original_path = private_dir / f"{image_id}-original{original_suffix(upload.filename)}"
    public_path = public_dir / f"{image_id}.jpg"
    thumb_path = public_dir / f"{image_id}-thumb.jpg"

    original_path.write_bytes(content)

    try:
        with Image.open(BytesIO(content)) as image:
            ensure_image_size(image)
            public_image = normalized_rgb(image)
    except (HTTPException, UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        cleanup_paths(original_path, public_path, thumb_path)
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=422, detail="Unsupported image file") from exc

    try:
        public_image.thumbnail(PUBLIC_MAX_SIZE)
        public_image.save(public_path, "JPEG", quality=PUBLIC_IMAGE_QUALITY, optimize=True)

        thumb_image = ImageOps.fit(
            public_image,
            THUMB_SIZE,
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        thumb_image.save(thumb_path, "JPEG", quality=PUBLIC_IMAGE_QUALITY, optimize=True)
    except OSError as exc:
        cleanup_paths(original_path, public_path, thumb_path)
        raise HTTPException(status_code=422, detail="Image file could not be processed") from exc

    return StoredImage(
        original_path=private_reference(original_path),
        public_path=public_url(public_path),
        thumb_path=public_url(thumb_path),
    )
