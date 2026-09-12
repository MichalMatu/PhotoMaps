from pathlib import Path

from PIL import Image

from app.models.photo import Photo
from app.services.admin_photos import review_admin_photo
from app.services.media import images
from app.services.photo_media import public_photo_image_url_for
from app.tests.support import create_place


def write_jpeg(path: Path) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (40, 30), (24, 80, 140)).save(path, "JPEG", quality=91)
    return path.read_bytes()


def test_approval_keeps_source_bytes_and_creates_only_thumbnail(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)
    original_path = f"photos/{place.id}/source-original.jpg"
    original_file = tmp_path / "private" / original_path
    source_bytes = write_jpeg(original_file)
    photo = Photo(place_id=place.id, original_path=original_path, status="pending")
    session.add(photo)
    session.commit()
    session.refresh(photo)

    reviewed = review_admin_photo(session, photo.id, "approved")

    assert reviewed.public_path == public_photo_image_url_for(reviewed)
    assert reviewed.thumb_path is not None
    assert original_file.read_bytes() == source_bytes
    thumb_file = images.public_storage_path(reviewed.thumb_path)
    assert thumb_file.is_file()
    legacy_public, _thumb = images.public_image_paths_for_original(reviewed.original_path, "JPEG")
    assert not legacy_public.exists()

    response = client.get(reviewed.public_path)
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.content == source_bytes


def test_original_endpoint_hides_nonapproved_and_nonpublic_photos(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)
    original_path = f"photos/{place.id}/pending-original.jpg"
    write_jpeg(tmp_path / "private" / original_path)
    photo = Photo(place_id=place.id, original_path=original_path, status="pending")
    session.add(photo)
    session.commit()
    session.refresh(photo)

    endpoint = f"/api/places/{place.id}/photos/{photo.id}/media/image"
    assert client.get(endpoint).status_code == 404

    photo.status = "approved"
    photo.public_path = endpoint
    photo.thumb_path = f"/media/photos/{place.id}/pending-thumb.jpg"
    session.add(photo)
    place.status = "draft"
    session.add(place)
    session.commit()

    assert client.get(endpoint).status_code == 404
