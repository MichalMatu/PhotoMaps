from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from mutagen import File as MutagenFile

from app.services.media import images
from app.services.media.images import cleanup_paths, private_reference, public_url, storage_path

MAX_AUDIO_BYTES = 12 * 1024 * 1024
MAX_AUDIO_DURATION_SECONDS = 180
MEDIA_KINDS = {"photos", "memories"}
SUPPORTED_AUDIO_MIME_TYPES = {"audio/mpeg", "audio/mp4", "audio/x-m4a"}
SUPPORTED_AUDIO_SUFFIXES = {
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
}


@dataclass(frozen=True)
class StoredAudio:
    original_path: str
    public_path: str
    mime_type: str
    size_bytes: int
    duration_seconds: float


def public_storage_path(public_url_path: str) -> Path:
    media_prefix = "/media/"
    if not public_url_path.startswith(media_prefix):
        raise ValueError("Unsupported public media URL")
    return storage_path(images.PUBLIC_STORAGE_DIR, public_url_path.removeprefix(media_prefix))


def delete_stored_audio(original_path: str | None, public_path: str | None) -> None:
    paths = []
    if original_path:
        paths.append(storage_path(images.PRIVATE_STORAGE_DIR, original_path))
    if public_path:
        paths.append(public_storage_path(public_path))

    cleanup_paths(*paths)


def audio_paths(media) -> tuple[str | None, str | None]:
    return media.audio_original_path, media.audio_public_path


def assign_stored_audio(media, stored_audio: StoredAudio) -> None:
    media.audio_original_path = stored_audio.original_path
    media.audio_public_path = stored_audio.public_path
    media.audio_mime_type = stored_audio.mime_type
    media.audio_size_bytes = stored_audio.size_bytes
    media.audio_duration_seconds = stored_audio.duration_seconds


def clear_audio_metadata(media) -> None:
    media.audio_original_path = None
    media.audio_public_path = None
    media.audio_mime_type = None
    media.audio_size_bytes = None
    media.audio_duration_seconds = None


def ensure_media_kind(media_kind: str) -> None:
    if media_kind not in MEDIA_KINDS:
        raise ValueError("Unsupported media kind")


def normalized_audio_mime_type(content_type: str | None, original_filename: str | None) -> str:
    content_type_value = (content_type or "").split(";")[0].strip().lower()
    if content_type_value in SUPPORTED_AUDIO_MIME_TYPES:
        return "audio/mp4" if content_type_value == "audio/x-m4a" else content_type_value

    suffix = Path(original_filename or "").suffix.lower()
    if suffix in SUPPORTED_AUDIO_SUFFIXES:
        return SUPPORTED_AUDIO_SUFFIXES[suffix]

    raise HTTPException(status_code=422, detail="Unsupported audio file")


def audio_suffix(mime_type: str) -> str:
    return ".mp3" if mime_type == "audio/mpeg" else ".m4a"


def audio_duration_seconds(content: bytes) -> float:
    try:
        audio = MutagenFile(BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Unsupported audio file") from exc

    duration = getattr(getattr(audio, "info", None), "length", None)
    if duration is None or duration <= 0:
        raise HTTPException(status_code=422, detail="Unsupported audio file")
    if duration > MAX_AUDIO_DURATION_SECONDS:
        raise HTTPException(status_code=413, detail="Audio duration is too long")
    return round(float(duration), 3)


def strip_public_audio_metadata(path: Path) -> None:
    try:
        audio = MutagenFile(str(path))
        if audio is not None and audio.tags is not None:
            audio.delete()
    except Exception as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail="Audio file could not be processed") from exc


def store_audio_bytes(
    content: bytes,
    original_filename: str | None,
    content_type: str | None,
    place_id: str,
    media_kind: str,
) -> StoredAudio:
    ensure_media_kind(media_kind)
    if not content:
        raise HTTPException(status_code=422, detail="Audio file is empty")
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file is too large")

    mime_type = normalized_audio_mime_type(content_type, original_filename)
    duration = audio_duration_seconds(content)
    media_id = str(uuid4())
    suffix = audio_suffix(mime_type)
    private_dir = images.PRIVATE_STORAGE_DIR / media_kind / place_id
    public_dir = images.PUBLIC_STORAGE_DIR / media_kind / place_id
    private_dir.mkdir(parents=True, exist_ok=True)
    public_dir.mkdir(parents=True, exist_ok=True)

    original_path = private_dir / f"{media_id}-audio-original{suffix}"
    public_path = public_dir / f"{media_id}-audio{suffix}"
    try:
        original_path.write_bytes(content)
        public_path.write_bytes(content)
        strip_public_audio_metadata(public_path)
    except HTTPException:
        cleanup_paths(original_path, public_path)
        raise
    except OSError as exc:
        cleanup_paths(original_path, public_path)
        raise HTTPException(status_code=422, detail="Audio file could not be processed") from exc

    return StoredAudio(
        original_path=private_reference(original_path),
        public_path=public_url(public_path),
        mime_type=mime_type,
        size_bytes=public_path.stat().st_size,
        duration_seconds=duration,
    )
