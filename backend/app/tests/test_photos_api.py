from datetime import UTC, datetime
from pathlib import Path

from conftest import ADMIN_HEADERS, create_place, image_upload, png_upload
from PIL import Image
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

from app.models.photo import Photo


def test_photo_upload_stays_pending_and_hidden_publicly(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        f"/api/places/{place.id}/photos",
        files={"file": image_upload("place.jpg")},
        data={"caption": "Front", "consent_confirmed": "true"},
    )
    public_response = client.get(f"/api/places/{place.id}/photos")

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["caption"] == "Front"
    assert "original_path" not in body
    assert body["public_path"].startswith("/media/photos/")
    assert public_response.status_code == 200
    assert public_response.json() == []


def test_png_photo_upload_preserves_public_png_alpha(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        f"/api/places/{place.id}/photos",
        files={"file": png_upload("place-icon.png")},
        data={"caption": "Ikona", "consent_confirmed": "true"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["public_path"].endswith(".png")
    assert body["thumb_path"].endswith(".png")

    public_file = tmp_path / "public" / body["public_path"].removeprefix("/media/")
    thumb_file = tmp_path / "public" / body["thumb_path"].removeprefix("/media/")
    with Image.open(public_file) as public_image:
        assert public_image.mode == "RGBA"
        assert public_image.getchannel("A").getextrema()[0] < 255
    with Image.open(thumb_file) as thumb_image:
        assert thumb_image.mode == "RGBA"
        assert thumb_image.getchannel("A").getextrema()[0] < 255


def test_photo_upload_cleans_files_when_database_save_fails(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)

    def fail_commit() -> None:
        raise SQLAlchemyError("commit failed")

    monkeypatch.setattr(session, "commit", fail_commit)

    response = client.post(
        f"/api/places/{place.id}/photos",
        files={"file": image_upload("place.jpg")},
        data={"caption": "Front", "consent_confirmed": "true"},
    )
    stored_files = [
        path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()
    ]

    assert response.status_code == 500
    assert response.json()["detail"] == "Photo could not be saved"
    assert stored_files == []
    assert session.exec(select(Photo)).all() == []


def test_photo_review_approves_and_updates_place_count(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    upload_response = client.post(
        f"/api/places/{place.id}/photos",
        files={"file": image_upload("place.jpg")},
        data={"consent_confirmed": "true"},
    )
    photo_id = upload_response.json()["id"]
    review_response = client.post(
        f"/api/admin/photos/{photo_id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "approved"},
    )
    public_response = client.get(f"/api/places/{place.id}/photos")
    session.refresh(place)

    assert review_response.status_code == 200
    assert review_response.json()["status"] == "approved"
    assert public_response.status_code == 200
    assert public_response.json()[0]["id"] == photo_id
    assert place.photo_count == 1
    assert place.cover_photo_id == photo_id


def test_rejecting_approved_photo_decrements_place_count(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    photo = Photo(
        place_id=place.id,
        original_path="photos/original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/thumb.jpg",
        status="approved",
    )
    place.photo_count = 1
    place.cover_photo_id = photo.id
    session.add(photo)
    session.add(place)
    session.commit()
    session.refresh(photo)

    response = client.post(
        f"/api/admin/photos/{photo.id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "rejected"},
    )
    session.refresh(place)

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert place.photo_count == 0
    assert place.cover_photo_id is None


def test_rejecting_cover_photo_selects_replacement(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    cover_photo = Photo(
        place_id=place.id,
        original_path="photos/cover-original.jpg",
        public_path="/media/photos/cover.jpg",
        thumb_path="/media/photos/cover-thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    replacement_photo = Photo(
        place_id=place.id,
        original_path="photos/replacement-original.jpg",
        public_path="/media/photos/replacement.jpg",
        thumb_path="/media/photos/replacement-thumb.jpg",
        status="approved",
        approved_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    session.add(cover_photo)
    session.add(replacement_photo)
    session.commit()
    session.refresh(cover_photo)
    session.refresh(replacement_photo)
    place.photo_count = 2
    place.cover_photo_id = cover_photo.id
    session.add(place)
    session.commit()

    response = client.post(
        f"/api/admin/photos/{cover_photo.id}/review",
        headers=ADMIN_HEADERS,
        json={"status": "rejected"},
    )
    session.refresh(place)

    assert response.status_code == 200
    assert place.photo_count == 1
    assert place.cover_photo_id == replacement_photo.id


def test_photo_upload_requires_publication_consent(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        f"/api/places/{place.id}/photos",
        files={"file": image_upload("place.jpg")},
        data={"caption": "Front", "consent_confirmed": "false"},
    )

    assert response.status_code == 422


def test_admin_photo_list_can_return_all_or_filtered_statuses(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    for status in ("pending", "approved", "rejected"):
        session.add(
            Photo(
                place_id=place.id,
                original_path=f"photos/{status}-original.jpg",
                public_path=f"/media/photos/{status}.jpg",
                thumb_path=f"/media/photos/{status}-thumb.jpg",
                status=status,
            )
        )
    session.commit()

    all_response = client.get("/api/admin/photos", headers=ADMIN_HEADERS)
    pending_response = client.get("/api/admin/photos?status=pending", headers=ADMIN_HEADERS)

    assert all_response.status_code == 200
    assert {photo["status"] for photo in all_response.json()} == {"pending", "approved", "rejected"}
    assert pending_response.status_code == 200
    assert [photo["status"] for photo in pending_response.json()] == ["pending"]


def test_admin_photo_list_ignores_records_without_place(client_session) -> None:
    client, session = client_session
    session.add(
        Photo(
            place_id="deleted-place",
            original_path="photos/orphan-original.jpg",
            public_path="/media/photos/orphan.jpg",
            thumb_path="/media/photos/orphan-thumb.jpg",
            status="approved",
        )
    )
    session.commit()

    response = client.get("/api/admin/photos", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert response.json() == []


def test_admin_can_update_photo_caption(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    photo = Photo(
        place_id=place.id,
        original_path="photos/original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/thumb.jpg",
        status="approved",
        caption="Stary podpis",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    response = client.patch(
        f"/api/admin/photos/{photo.id}",
        headers=ADMIN_HEADERS,
        json={"caption": "  Nowy podpis  "},
    )
    session.refresh(photo)

    assert response.status_code == 200
    assert response.json()["caption"] == "Nowy podpis"
    assert photo.caption == "Nowy podpis"


def test_admin_photo_caption_has_length_limit(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    photo = Photo(
        place_id=place.id,
        original_path="photos/original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/thumb.jpg",
        status="approved",
        caption="Stary podpis",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    response = client.patch(
        f"/api/admin/photos/{photo.id}",
        headers=ADMIN_HEADERS,
        json={"caption": "x" * 121},
    )

    assert response.status_code == 422


def test_admin_can_set_approved_photo_as_cover(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    pending_photo = Photo(
        place_id=place.id,
        original_path="photos/pending-original.jpg",
        public_path="/media/photos/pending.jpg",
        thumb_path="/media/photos/pending-thumb.jpg",
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


def test_admin_delete_photo_removes_record_files_and_updates_place(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)

    first_original = Path("photos") / place.id / "first-original.jpg"
    first_public = Path("photos") / place.id / "first.jpg"
    first_thumb = Path("photos") / place.id / "first-thumb.jpg"
    private_file = tmp_path / "private" / first_original
    public_file = tmp_path / "public" / first_public
    thumb_file = tmp_path / "public" / first_thumb
    private_file.parent.mkdir(parents=True, exist_ok=True)
    public_file.parent.mkdir(parents=True, exist_ok=True)
    private_file.write_bytes(b"private")
    public_file.write_bytes(b"public")
    thumb_file.write_bytes(b"thumb")

    first_photo = Photo(
        place_id=place.id,
        original_path=first_original.as_posix(),
        public_path=f"/media/{first_public.as_posix()}",
        thumb_path=f"/media/{first_thumb.as_posix()}",
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
    assert not public_file.exists()
    assert not thumb_file.exists()
