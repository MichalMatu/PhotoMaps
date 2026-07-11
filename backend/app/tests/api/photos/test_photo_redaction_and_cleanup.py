from datetime import UTC, datetime
from pathlib import Path

from PIL import Image

from app.models.photo import Photo
from app.tests.support import ADMIN_HEADERS, create_place, detailed_image_upload


def image_pixel(path: Path, xy: tuple[int, int]) -> tuple[int, int, int]:
    with Image.open(path) as image:
        return image.convert("RGB").getpixel(xy)


def assert_blurred_pixel(value: tuple[int, int, int]) -> None:
    assert 40 < value[0] < 220
    assert 40 < value[1] < 220
    assert 40 < value[2] < 220


def test_admin_can_redact_photo_by_polygon(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)
    upload_response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": detailed_image_upload("place.jpg")},
        data={"caption": "Główne"},
    )
    photo = session.get(Photo, upload_response.json()["id"])
    assert photo is not None

    response = client.post(
        f"/api/admin/photos/{photo.id}/redaction",
        headers=ADMIN_HEADERS,
        json={
            "rectangles": [],
            "polygons": [
                [
                    {"x": 0, "y": 0},
                    {"x": 1, "y": 0},
                    {"x": 1, "y": 1},
                    {"x": 0, "y": 1},
                ]
            ],
        },
    )
    private_file = tmp_path / "private" / photo.original_path

    assert response.status_code == 200
    assert response.json()["summary"]["actions"]["applied"] == 1
    assert response.json()["actions"][0]["action"] == "redact_image"
    assert response.json()["issues"] == []
    assert photo.public_path is None
    assert photo.thumb_path is None
    assert_blurred_pixel(image_pixel(private_file, (16, 16)))


def test_admin_photo_redaction_requires_shape(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    photo = Photo(
        place_id=place.id,
        original_path="photos/original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/thumb.jpg",
        status="approved",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    response = client.post(
        f"/api/admin/photos/{photo.id}/redaction",
        headers=ADMIN_HEADERS,
        json={"rectangles": [], "polygons": []},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "At least one redaction shape is required"


def test_admin_can_set_approved_photo_as_cover(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    pending_photo = Photo(
        place_id=place.id,
        original_path="photos/pending-original.jpg",
        public_path=None,
        thumb_path=None,
        status="pending",
    )
    approved_photo = Photo(
        place_id=place.id,
        original_path="photos/approved-original.jpg",
        public_path="/media/photos/approved.jpg",
        thumb_path="/media/photos/approved-thumb.jpg",
        status="approved",
        approved_at=datetime.now(UTC),
    )
    session.add(pending_photo)
    session.add(approved_photo)
    session.commit()
    session.refresh(pending_photo)
    session.refresh(approved_photo)

    pending_response = client.post(f"/api/admin/photos/{pending_photo.id}/cover", headers=ADMIN_HEADERS)
    approved_response = client.post(f"/api/admin/photos/{approved_photo.id}/cover", headers=ADMIN_HEADERS)
    session.refresh(place)

    assert pending_response.status_code == 422
    assert approved_response.status_code == 200
    assert approved_response.json()["cover_photo_id"] == approved_photo.id
    assert place.cover_photo_id == approved_photo.id


def test_public_photo_list_returns_cover_first(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    older_photo = Photo(
        place_id=place.id,
        original_path="photos/older-original.jpg",
        public_path="/media/photos/older.jpg",
        thumb_path="/media/photos/older-thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    cover_photo = Photo(
        place_id=place.id,
        original_path="photos/cover-original.jpg",
        public_path="/media/photos/cover.jpg",
        thumb_path="/media/photos/cover-thumb.jpg",
        status="approved",
        attribution_author="Marta",
        attribution_license="CC0",
        attribution_license_url="https://creativecommons.org/publicdomain/zero/1.0/",
        attribution_source_url="https://commons.wikimedia.org/wiki/File:Cover.jpg",
        approved_at=datetime(2025, 1, 1, tzinfo=UTC),
    )
    session.add(older_photo)
    session.add(cover_photo)
    session.commit()
    session.refresh(cover_photo)
    place.cover_photo_id = cover_photo.id
    session.add(place)
    session.commit()

    response = client.get(f"/api/places/{place.id}/photos")

    assert response.status_code == 200
    assert response.json()[0]["id"] == cover_photo.id
    assert response.json()[0]["attribution_author"] == "Marta"
    assert response.json()[0]["attribution_license"] == "CC0"
    assert response.json()[0]["attribution_license_url"] == "https://creativecommons.org/publicdomain/zero/1.0/"
    assert response.json()[0]["attribution_source_url"] == "https://commons.wikimedia.org/wiki/File:Cover.jpg"


def test_admin_delete_photo_removes_record_files_and_updates_place(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)

    first_original = Path("photos") / place.id / "first-original.jpg"
    first_public = Path("photos") / place.id / "first.jpg"
    first_thumb = Path("photos") / place.id / "first-thumb.jpg"
    first_audio_original = Path("photos") / place.id / "first-audio-original.mp3"
    first_audio_public = Path("photos") / place.id / "first-audio.mp3"
    private_file = tmp_path / "private" / first_original
    private_audio_file = tmp_path / "private" / first_audio_original
    public_file = tmp_path / "public" / first_public
    thumb_file = tmp_path / "public" / first_thumb
    public_audio_file = tmp_path / "public" / first_audio_public
    private_file.parent.mkdir(parents=True, exist_ok=True)
    public_file.parent.mkdir(parents=True, exist_ok=True)
    private_file.write_bytes(b"private")
    private_audio_file.write_bytes(b"private-audio")
    public_file.write_bytes(b"public")
    thumb_file.write_bytes(b"thumb")
    public_audio_file.write_bytes(b"public-audio")

    first_photo = Photo(
        place_id=place.id,
        original_path=first_original.as_posix(),
        public_path=f"/media/{first_public.as_posix()}",
        thumb_path=f"/media/{first_thumb.as_posix()}",
        audio_original_path=first_audio_original.as_posix(),
        audio_public_path=f"/media/{first_audio_public.as_posix()}",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=len(b"public-audio"),
        audio_duration_seconds=1.25,
        status="approved",
        approved_at=datetime.now(UTC),
    )
    second_photo = Photo(
        place_id=place.id,
        original_path="photos/second-original.jpg",
        public_path="/media/photos/second.jpg",
        thumb_path="/media/photos/second-thumb.jpg",
        status="approved",
        approved_at=datetime.now(UTC),
    )
    session.add(first_photo)
    session.add(second_photo)
    session.commit()
    session.refresh(first_photo)
    session.refresh(second_photo)
    place.photo_count = 2
    place.cover_photo_id = first_photo.id
    session.add(place)
    session.commit()

    response = client.delete(f"/api/admin/photos/{first_photo.id}", headers=ADMIN_HEADERS)
    session.refresh(place)

    assert response.status_code == 204
    assert session.get(Photo, first_photo.id) is None
    assert place.photo_count == 1
    assert place.cover_photo_id == second_photo.id
    assert not private_file.exists()
    assert not private_audio_file.exists()
    assert not public_file.exists()
    assert not public_audio_file.exists()
    assert not thumb_file.exists()
