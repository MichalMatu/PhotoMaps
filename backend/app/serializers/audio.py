from typing import Protocol

from app.schemas.audio import AudioAttachment


class AudioBearingMedia(Protocol):
    audio_public_path: str | None
    audio_mime_type: str | None
    audio_size_bytes: int | None
    audio_duration_seconds: float | None


def audio_to_read(media: AudioBearingMedia) -> AudioAttachment | None:
    if (
        media.audio_public_path is None
        or media.audio_mime_type is None
        or media.audio_size_bytes is None
        or media.audio_duration_seconds is None
    ):
        return None

    return AudioAttachment(
        public_path=media.audio_public_path,
        mime_type=media.audio_mime_type,
        size_bytes=media.audio_size_bytes,
        duration_seconds=media.audio_duration_seconds,
    )
