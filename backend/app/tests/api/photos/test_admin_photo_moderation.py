from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException
from PIL import Image
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

from app.models.photo import Photo
from app.services.media import audio as audio_service
from app.tests.support import ADMIN_HEADERS, audio_upload, create_place, image_upload, png_upload


def image_pixel(path: Path, xy: tuple[int, int]) -> tuple[int, int, int]:
    with Image.open(path) as image:
        return image.convert("RGB").getpixel(xy)


def sized_jpeg_upload(filename: str, size: tuple[int, int]) -> tuple[str, BytesIO, str]:
    buffer = BytesIO()
    image = Image.new("RGB", size, (32, 94, 146))
    image.save(buffer, format="JPEG")
    buffer.seek(0)
    return filename, buffer, "image/jpeg"


def assert_blurred_pixel(value: tuple[int, int, int]) -> None:
    assert 40 < value[0] < 220
    assert 40 < value[1] < 220
    assert 40 < value[2] < 220


def test_photo_review_approves_and_updates_place_count(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    upload_response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("place.jpg")},
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


def test_admin_can_upload_photo_for_draft_place(client_session) -> None:
    client, session = client_session
    place = create_place(session, status="draft")

    response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("draft-place.jpg")},
        data={
            "attribution_author": "  Marta  ",
            "attribution_license": "  CC BY 4.0  ",
            "attribution_license_url": "  https://creativecommons.org/licenses/by/4.0/  ",
            "attribution_source_url": "  https://commons.wikimedia.org/wiki/File:Photo.jpg  ",
            "caption": "Główne",
            "description_blocks": '[{"type":"paragraph","text":"  Wieczorny widok na wejście i detale fasady.  "}]',
        },
    )
    photo = session.exec(select(Photo)).one()

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == photo.id
    assert body["place_id"] == place.id
    assert body["status"] == "pending"
    assert body["source"] == "editorial"
    assert body["caption"] == "Główne"
    assert body["description_blocks"] == [
        {"type": "paragraph", "text": "Wieczorny widok na wejście i detale fasady.", "url": None}
    ]
    assert body["attribution_author"] == "Marta"
    assert body["attribution_license"] == "CC BY 4.0"
    assert body["attribution_license_url"] == "https://creativecommons.org/licenses/by/4.0/"
    assert body["attribution_source_url"] == "https://commons.wikimedia.org/wiki/File:Photo.jpg"
    assert body["consent_confirmed"] is True
    assert photo.attribution_author == "Marta"
    assert photo.description_blocks == [{"type": "paragraph", "text": "Wieczorny widok na wejście i detale fasady."}]
    assert photo.attribution_license == "CC BY 4.0"
    assert photo.attribution_license_url == "https://creativecommons.org/licenses/by/4.0/"
    assert photo.attribution_source_url == "https://commons.wikimedia.org/wiki/File:Photo.jpg"


def test_admin_can_upload_photo_with_audio(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session, status="draft")
    monkeypatch.setattr(audio_service, "audio_duration_seconds", lambda _content: 1.25)
    monkeypatch.setattr(audio_service, "strip_public_audio_metadata", lambda _path: None)

    response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("draft-place.jpg"), "audio_file": audio_upload("place.mp3")},
        data={"caption": "Główne"},
    )
    photo = session.exec(select(Photo)).one()

    assert response.status_code == 201
    body = response.json()
    assert body["audio"] == {
        "duration_seconds": 1.25,
        "mime_type": "audio/mpeg",
        "public_path": photo.audio_public_path,
        "size_bytes": len(b"test-audio"),
    }
    assert "audio_original_path" not in body
    assert photo.audio_original_path is not None
    assert photo.audio_public_path is not None


def test_admin_can_upload_photo_with_flac_audio(client_session, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session, status="draft")
    monkeypatch.setattr(audio_service, "audio_duration_seconds", lambda _content: 2.0)
    monkeypatch.setattr(audio_service, "strip_public_audio_metadata", lambda _path: None)

    response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={
            "file": image_upload("draft-place.jpg"),
            "audio_file": audio_upload("rynek.flac", b"flac-audio", "application/octet-stream"),
        },
        data={"caption": "Gwar rynku"},
    )
    photo = session.exec(select(Photo)).one()

    assert response.status_code == 201
    body = response.json()
    assert body["audio"] == {
        "duration_seconds": 2.0,
        "mime_type": "audio/flac",
        "public_path": photo.audio_public_path,
        "size_bytes": len(b"flac-audio"),
    }
    assert "audio_original_path" not in body
    assert photo.audio_original_path is not None
    assert photo.audio_original_path.endswith(".flac")
    assert photo.audio_public_path is not None
    assert photo.audio_public_path.endswith(".flac")


def test_admin_png_photo_upload_preserves_public_png_alpha(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)

    response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": png_upload("transparent-detail.png")},
        data={"caption": "Detal"},
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


def test_admin_photo_upload_preserves_public_image_resolution(client_session, tmp_path: Path) -> None:
    client, session = client_session
    place = create_place(session)
    original_size = (2400, 1600)

    response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": sized_jpeg_upload("large-place.jpg", original_size)},
        data={"caption": "Detal"},
    )

    assert response.status_code == 201
    body = response.json()
    public_file = tmp_path / "public" / body["public_path"].removeprefix("/media/")
    thumb_file = tmp_path / "public" / body["thumb_path"].removeprefix("/media/")
    with Image.open(public_file) as public_image:
        assert public_image.size == original_size
    with Image.open(thumb_file) as thumb_image:
        assert thumb_image.size == (520, 520)
    assert thumb_file.stat().st_size < public_file.stat().st_size


def test_admin_photo_upload_cleans_files_when_database_save_fails(
    client_session,
    tmp_path: Path,
    monkeypatch,
) -> None:
    client, session = client_session
    place = create_place(session)

    def fail_commit() -> None:
        raise SQLAlchemyError("commit failed")

    monkeypatch.setattr(session, "commit", fail_commit)

    response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("place.jpg")},
        data={"caption": "Front"},
    )
    stored_files = [
        path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()
    ]

    assert response.status_code == 500
    assert response.json()["detail"] == "Photo could not be saved"
    assert stored_files == []
    assert session.exec(select(Photo)).all() == []


def test_admin_photo_upload_with_audio_cleans_files_when_database_save_fails(
    client_session,
    tmp_path: Path,
    monkeypatch,
) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(audio_service, "audio_duration_seconds", lambda _content: 1.25)
    monkeypatch.setattr(audio_service, "strip_public_audio_metadata", lambda _path: None)

    def fail_commit() -> None:
        raise SQLAlchemyError("commit failed")

    monkeypatch.setattr(session, "commit", fail_commit)

    response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("place.jpg"), "audio_file": audio_upload("place.mp3")},
        data={"caption": "Front"},
    )
    stored_files = [
        path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()
    ]

    assert response.status_code == 500
    assert response.json()["detail"] == "Photo could not be saved"
    assert stored_files == []
    assert session.exec(select(Photo)).all() == []


def test_admin_photo_upload_rejects_invalid_audio(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)

    def reject_too_long_audio(_content: bytes) -> float:
        raise HTTPException(status_code=413, detail="Audio duration is too long")

    monkeypatch.setattr(audio_service, "audio_duration_seconds", reject_too_long_audio)

    bad_type_response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("place.jpg"), "audio_file": ("clip.wav", b"audio", "audio/wav")},
        data={"caption": "Front"},
    )
    too_large_response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={
            "file": image_upload("place.jpg"),
            "audio_file": audio_upload("large.mp3", b"x" * (audio_service.MAX_AUDIO_BYTES + 1)),
        },
        data={"caption": "Front"},
    )
    too_long_response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("place.jpg"), "audio_file": audio_upload("long.mp3")},
        data={"caption": "Front"},
    )
    stored_files = [
        path for root in (tmp_path / "private", tmp_path / "public") for path in root.rglob("*") if path.is_file()
    ]

    assert bad_type_response.status_code == 422
    assert bad_type_response.json()["detail"] == "Unsupported audio file"
    assert too_large_response.status_code == 413
    assert too_large_response.json()["detail"] == "Audio file is too large"
    assert too_long_response.status_code == 413
    assert too_long_response.json()["detail"] == "Audio duration is too long"
    assert stored_files == []
    assert session.exec(select(Photo)).all() == []


def test_admin_can_replace_and_delete_existing_photo_audio(client_session, tmp_path: Path, monkeypatch) -> None:
    client, session = client_session
    place = create_place(session)
    monkeypatch.setattr(audio_service, "audio_duration_seconds", lambda _content: 2.5)
    monkeypatch.setattr(audio_service, "strip_public_audio_metadata", lambda _path: None)

    old_audio_original = Path("photos") / place.id / "old-audio-original.mp3"
    old_audio_public = Path("photos") / place.id / "old-audio.mp3"
    old_private_file = tmp_path / "private" / old_audio_original
    old_public_file = tmp_path / "public" / old_audio_public
    old_private_file.parent.mkdir(parents=True, exist_ok=True)
    old_public_file.parent.mkdir(parents=True, exist_ok=True)
    old_private_file.write_bytes(b"old-private-audio")
    old_public_file.write_bytes(b"old-public-audio")
    photo = Photo(
        place_id=place.id,
        original_path="photos/existing-original.jpg",
        public_path="/media/photos/existing.jpg",
        thumb_path="/media/photos/existing-thumb.jpg",
        audio_original_path=old_audio_original.as_posix(),
        audio_public_path=f"/media/{old_audio_public.as_posix()}",
        audio_mime_type="audio/mpeg",
        audio_size_bytes=len(b"old-public-audio"),
        audio_duration_seconds=1.25,
        status="approved",
        approved_at=datetime.now(UTC),
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    replace_response = client.put(
        f"/api/admin/photos/{photo.id}/audio",
        headers=ADMIN_HEADERS,
        files={"audio_file": audio_upload("new.mp3", b"new-audio")},
    )
    session.refresh(photo)
    new_private_file = tmp_path / "private" / photo.audio_original_path
    new_public_file = tmp_path / "public" / photo.audio_public_path.removeprefix("/media/")
    public_response = client.get(f"/api/places/{place.id}/photos")

    assert replace_response.status_code == 200
    assert replace_response.json()["audio"] == {
        "duration_seconds": 2.5,
        "mime_type": "audio/mpeg",
        "public_path": photo.audio_public_path,
        "size_bytes": len(b"new-audio"),
    }
    assert "audio_original_path" not in replace_response.json()
    assert not old_private_file.exists()
    assert not old_public_file.exists()
    assert new_private_file.exists()
    assert new_public_file.exists()
    assert public_response.json()[0]["audio"]["public_path"] == photo.audio_public_path

    delete_response = client.delete(f"/api/admin/photos/{photo.id}/audio", headers=ADMIN_HEADERS)
    session.refresh(photo)
    public_response_after_delete = client.get(f"/api/places/{place.id}/photos")

    assert delete_response.status_code == 200
    assert delete_response.json()["audio"] is None
    assert photo.audio_original_path is None
    assert photo.audio_public_path is None
    assert not new_private_file.exists()
    assert not new_public_file.exists()
    assert public_response_after_delete.json()[0]["audio"] is None


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


def test_admin_photo_list_applies_queue_limit(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    for index in range(3):
        session.add(
            Photo(
                place_id=place.id,
                original_path=f"photos/{index}-original.jpg",
                public_path=f"/media/photos/{index}.jpg",
                thumb_path=f"/media/photos/{index}-thumb.jpg",
                status="pending",
                created_at=datetime(2026, 1, index + 1, tzinfo=UTC),
            )
        )
    session.commit()

    response = client.get("/api/admin/photos?limit=2", headers=ADMIN_HEADERS)
    next_response = client.get("/api/admin/photos?limit=2&offset=2", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert next_response.status_code == 200
    assert len(next_response.json()) == 1
    assert {photo["id"] for photo in response.json()}.isdisjoint({photo["id"] for photo in next_response.json()})


def test_admin_place_photo_list_returns_selected_place_photos(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    other_place = create_place(session, slug="inne-miejsce", title="Inne miejsce")
    target_photo = Photo(
        place_id=place.id,
        original_path="photos/target-original.jpg",
        public_path="/media/photos/target.jpg",
        thumb_path="/media/photos/target-thumb.jpg",
        status="approved",
        created_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    target_pending_photo = Photo(
        place_id=place.id,
        original_path="photos/target-pending-original.jpg",
        public_path="/media/photos/target-pending.jpg",
        thumb_path="/media/photos/target-pending-thumb.jpg",
        status="pending",
        created_at=datetime(2026, 1, 2, tzinfo=UTC),
    )
    other_photo = Photo(
        place_id=other_place.id,
        original_path="photos/other-original.jpg",
        public_path="/media/photos/other.jpg",
        thumb_path="/media/photos/other-thumb.jpg",
        status="approved",
        created_at=datetime(2026, 1, 3, tzinfo=UTC),
    )
    session.add(target_photo)
    session.add(target_pending_photo)
    session.add(other_photo)
    session.commit()
    session.refresh(target_photo)
    session.refresh(target_pending_photo)

    response = client.get(f"/api/admin/places/{place.id}/photos", headers=ADMIN_HEADERS)

    assert response.status_code == 200
    assert [photo["id"] for photo in response.json()] == [target_pending_photo.id, target_photo.id]
    assert {photo["place_id"] for photo in response.json()} == {place.id}


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
        description_blocks=[{"type": "paragraph", "text": "Stary opis"}],
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    response = client.patch(
        f"/api/admin/photos/{photo.id}",
        headers=ADMIN_HEADERS,
        json={
            "caption": "  Nowy podpis  ",
            "description_blocks": [{"type": "paragraph", "text": "  Nowy opis do odsłuchu.  "}],
        },
    )
    session.refresh(photo)

    assert response.status_code == 200
    assert response.json()["caption"] == "Nowy podpis"
    assert response.json()["description_blocks"] == [
        {"type": "paragraph", "text": "Nowy opis do odsłuchu.", "url": None}
    ]
    assert photo.caption == "Nowy podpis"
    assert photo.description_blocks == [{"type": "paragraph", "text": "Nowy opis do odsłuchu."}]


def test_admin_can_clear_photo_description(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    photo = Photo(
        place_id=place.id,
        original_path="photos/original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/thumb.jpg",
        status="approved",
        description_blocks=[{"type": "paragraph", "text": "Opis do usunięcia"}],
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    response = client.patch(
        f"/api/admin/photos/{photo.id}",
        headers=ADMIN_HEADERS,
        json={"description_blocks": []},
    )
    session.refresh(photo)

    assert response.status_code == 200
    assert response.json()["description_blocks"] == []
    assert photo.description_blocks == []


def test_admin_can_update_photo_attribution(client_session) -> None:
    client, session = client_session
    place = create_place(session)
    photo = Photo(
        place_id=place.id,
        original_path="photos/original.jpg",
        public_path="/media/photos/public.jpg",
        thumb_path="/media/photos/thumb.jpg",
        status="approved",
        caption="Podpis",
        attribution_author="Stary autor",
        attribution_license="CC BY 4.0",
        attribution_license_url="https://creativecommons.org/licenses/by/4.0/",
        attribution_source_url="https://commons.wikimedia.org/wiki/File:Old.jpg",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    response = client.patch(
        f"/api/admin/photos/{photo.id}",
        headers=ADMIN_HEADERS,
        json={
            "attribution_author": "  Nowa autorka  ",
            "attribution_license": "",
            "attribution_source_url": "https://commons.wikimedia.org/wiki/File:New.jpg",
        },
    )
    session.refresh(photo)

    assert response.status_code == 200
    body = response.json()
    assert body["caption"] == "Podpis"
    assert body["attribution_author"] == "Nowa autorka"
    assert body["attribution_license"] is None
    assert body["attribution_license_url"] == "https://creativecommons.org/licenses/by/4.0/"
    assert body["attribution_source_url"] == "https://commons.wikimedia.org/wiki/File:New.jpg"
    assert photo.attribution_author == "Nowa autorka"
    assert photo.attribution_license is None


def test_photo_attribution_rejects_invalid_urls(client_session) -> None:
    client, session = client_session
    place = create_place(session)

    upload_response = client.post(
        f"/api/admin/places/{place.id}/photos",
        headers=ADMIN_HEADERS,
        files={"file": image_upload("draft-place.jpg")},
        data={"attribution_source_url": "commons.wikimedia.org/wiki/File:Photo.jpg"},
    )
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

    update_response = client.patch(
        f"/api/admin/photos/{photo.id}",
        headers=ADMIN_HEADERS,
        json={"attribution_license_url": "ftp://example.com/license"},
    )

    assert upload_response.status_code == 422
    assert upload_response.json()["detail"] == "Photo attribution source URL must be a valid HTTP(S) URL"
    assert update_response.status_code == 422
    assert update_response.json()["detail"] == "Photo attribution license URL must be a valid HTTP(S) URL"


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


def test_admin_photo_description_blocks_reject_empty_text(client_session) -> None:
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

    response = client.patch(
        f"/api/admin/photos/{photo.id}",
        headers=ADMIN_HEADERS,
        json={"description_blocks": [{"type": "paragraph", "text": "   "}]},
    )

    assert response.status_code == 422
