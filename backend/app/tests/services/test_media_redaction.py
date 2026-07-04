from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

from app.models.photo import Photo
from app.services.media.redaction import RedactionPolygon, RedactionRegion, redact_media_image
from app.tests.support import create_place


def write_image(root: Path, relative_path: str, color: tuple[int, int, int], size: tuple[int, int] = (20, 20)) -> Path:
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", size, color).save(path, "JPEG")
    return path


def write_detailed_image(
    root: Path,
    relative_path: str,
    size: tuple[int, int] = (80, 80),
    detail_region: tuple[float, float, float, float] = (0.25, 0.25, 0.75, 0.75),
) -> Path:
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", size, (240, 240, 240))
    draw = ImageDraw.Draw(image)
    left = round(size[0] * detail_region[0])
    top = round(size[1] * detail_region[1])
    right = round(size[0] * detail_region[2])
    bottom = round(size[1] * detail_region[3])
    for y_value in range(top, bottom):
        for x_value in range(left, right):
            color = (20, 20, 20) if ((x_value // 4) + (y_value // 4)) % 2 == 0 else (230, 230, 230)
            draw.point((x_value, y_value), fill=color)
    image.save(path, "JPEG")
    return path


def write_thumb(public_file: Path, thumb_file: Path) -> None:
    with Image.open(public_file) as image:
        thumb_image = ImageOps.fit(
            image,
            (520, 520),
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        thumb_image.save(thumb_file, "JPEG")


def pixel(path: Path, xy: tuple[int, int]) -> tuple[int, int, int]:
    with Image.open(path) as image:
        return image.convert("RGB").getpixel(xy)


def assert_light(value: tuple[int, int, int]) -> None:
    assert value[0] > 200
    assert value[1] > 200
    assert value[2] > 200


def assert_blurred(value: tuple[int, int, int]) -> None:
    assert 40 < value[0] < 220
    assert 40 < value[1] < 220
    assert 40 < value[2] < 220


def test_media_redaction_dry_run_and_apply_update_all_existing_images(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    original_path = f"photos/{place.id}/photo-original.jpg"
    public_path = f"photos/{place.id}/photo.jpg"
    thumb_path = f"photos/{place.id}/photo-thumb.jpg"
    original_file = write_detailed_image(private_root, original_path)
    public_file = write_detailed_image(public_root, public_path)
    thumb_file = write_detailed_image(public_root, thumb_path)
    photo = Photo(
        place_id=place.id,
        original_path=original_path,
        public_path=f"/media/{public_path}",
        thumb_path=f"/media/{thumb_path}",
        status="approved",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)
    shapes = [RedactionRegion(left=0.25, top=0.25, right=0.75, bottom=0.75)]

    dry_report = redact_media_image(session, kind="photo", media_id=photo.id, shapes=shapes, apply_changes=False)
    apply_report = redact_media_image(session, kind="photo", media_id=photo.id, shapes=shapes, apply_changes=True)

    assert dry_report["summary"]["actions"]["applied"] == 0
    assert apply_report["status"] == "ok"
    assert apply_report["summary"]["actions"]["applied"] == 3
    for path in (original_file, public_file):
        redacted_pixel = pixel(path, (40, 40))
        untouched_pixel = pixel(path, (1, 1))
        assert_blurred(redacted_pixel)
        assert_light(untouched_pixel)
    with Image.open(thumb_file) as thumb_image:
        assert thumb_image.size == (520, 520)
    assert_blurred(pixel(thumb_file, (260, 260)))
    assert_light(pixel(thumb_file, (1, 1)))


def test_media_redaction_regenerates_cropped_thumb_from_public_image(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    original_path = f"photos/{place.id}/wide-original.jpg"
    public_path = f"photos/{place.id}/wide.jpg"
    thumb_path = f"photos/{place.id}/wide-thumb.jpg"
    write_detailed_image(private_root, original_path, size=(100, 50), detail_region=(0.55, 0.2, 0.75, 0.6))
    public_file = write_detailed_image(public_root, public_path, size=(100, 50), detail_region=(0.55, 0.2, 0.75, 0.6))
    thumb_file = public_root / thumb_path
    thumb_file.parent.mkdir(parents=True, exist_ok=True)
    write_thumb(public_file, thumb_file)
    photo = Photo(
        place_id=place.id,
        original_path=original_path,
        public_path=f"/media/{public_path}",
        thumb_path=f"/media/{thumb_path}",
        status="approved",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    report = redact_media_image(
        session,
        kind="photo",
        media_id=photo.id,
        shapes=[RedactionRegion(left=0.55, top=0.2, right=0.75, bottom=0.6)],
        apply_changes=True,
    )

    assert report["status"] == "ok"
    assert report["actions"][2]["action"] == "regenerate_thumb"
    assert_blurred(pixel(public_file, (65, 20)))
    assert_light(pixel(thumb_file, (260, 200)))
    assert_blurred(pixel(thumb_file, (500, 200)))


def test_media_redaction_does_not_partially_apply_when_required_derivative_is_missing(
    client_session,
    tmp_path: Path,
) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    original_path = f"photos/{place.id}/missing-thumb-original.jpg"
    public_path = f"photos/{place.id}/missing-thumb.jpg"
    thumb_path = f"photos/{place.id}/missing-thumb-thumb.jpg"
    original_file = write_detailed_image(private_root, original_path)
    public_file = write_detailed_image(public_root, public_path)
    thumb_file = write_detailed_image(public_root, thumb_path)
    before_original = original_file.read_bytes()
    before_public = public_file.read_bytes()
    thumb_file.unlink()
    photo = Photo(
        place_id=place.id,
        original_path=original_path,
        public_path=f"/media/{public_path}",
        thumb_path=f"/media/{thumb_path}",
        status="approved",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    report = redact_media_image(
        session,
        kind="photo",
        media_id=photo.id,
        shapes=[RedactionRegion(left=0.25, top=0.25, right=0.75, bottom=0.75)],
        apply_changes=True,
    )

    assert report["status"] == "error"
    assert report["summary"]["actions"]["applied"] == 0
    assert report["issues"][0]["code"] == "thumb_missing"
    assert original_file.read_bytes() == before_original
    assert public_file.read_bytes() == before_public


def test_media_redaction_supports_polygons(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    original_path = f"photos/{place.id}/polygon-original.jpg"
    public_path = f"photos/{place.id}/polygon.jpg"
    thumb_path = f"photos/{place.id}/polygon-thumb.jpg"
    write_detailed_image(private_root, original_path)
    public_file = write_detailed_image(public_root, public_path)
    write_detailed_image(public_root, thumb_path)
    photo = Photo(
        place_id=place.id,
        original_path=original_path,
        public_path=f"/media/{public_path}",
        thumb_path=f"/media/{thumb_path}",
        status="approved",
    )
    session.add(photo)
    session.commit()
    session.refresh(photo)

    report = redact_media_image(
        session,
        kind="photo",
        media_id=photo.id,
        shapes=[RedactionPolygon(points=((0.1, 0.1), (0.9, 0.1), (0.5, 0.9)))],
        apply_changes=True,
    )

    assert report["status"] == "ok"
    redacted_pixel = pixel(public_file, (40, 25))
    assert_blurred(redacted_pixel)
