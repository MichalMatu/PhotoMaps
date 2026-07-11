import pytest
from fastapi import HTTPException

from app.services.media import audio as audio_service


def mp4_box(box_type: str, payload: bytes) -> bytes:
    return (len(payload) + 8).to_bytes(4, "big") + box_type.encode("ascii") + payload


def version_zero_duration_box(timescale: int, duration: int) -> bytes:
    return (
        b"\x00\x00\x00\x00"
        + (0).to_bytes(4, "big")
        + (0).to_bytes(4, "big")
        + timescale.to_bytes(4, "big")
        + duration.to_bytes(4, "big")
    )


def test_audio_duration_uses_mp4_box_duration_when_mutagen_has_no_length(monkeypatch: pytest.MonkeyPatch) -> None:
    class EmptyAudioInfo:
        length = 0

    class EmptyAudio:
        info = EmptyAudioInfo()

    monkeypatch.setattr(audio_service, "MutagenFile", lambda _source: EmptyAudio())
    content = mp4_box("ftyp", b"M4A \x00\x00\x00\x00") + mp4_box(
        "moov", mp4_box("mvhd", version_zero_duration_box(10000, 716362))
    )

    assert audio_service.audio_duration_seconds(content) == 71.636


def test_audio_duration_rejects_mp4_box_duration_over_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    class EmptyAudioInfo:
        length = 0

    class EmptyAudio:
        info = EmptyAudioInfo()

    monkeypatch.setattr(audio_service, "MutagenFile", lambda _source: EmptyAudio())
    content = mp4_box("moov", mp4_box("mvhd", version_zero_duration_box(1000, 181000)))

    with pytest.raises(HTTPException) as exc_info:
        audio_service.audio_duration_seconds(content)

    assert exc_info.value.status_code == 413
    assert exc_info.value.detail == "Audio duration is too long"
