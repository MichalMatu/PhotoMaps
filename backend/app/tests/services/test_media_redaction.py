from pathlib import Path

from PIL import Image, ImageDraw

from app.models.memory import Memory
from app.models.photo import Photo
from app.services.media.redaction import RedactionPolygon, RedactionRegion, redact_media_image
from app.services.tokens import claim_token_hash
from app.tests.support import create_place


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


def test_photo_redaction_refuses_to_modify_immutable_original(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    original_path = f"photos/{place.id}/photo-original.jpg"
    thumb_path = f"photos/{place.id}/photo-thumb.jpg"
    original_file = write_detailed_image(private_root, original_path)
    thumb_file = write_detailed_image(public_root, thumb_path)
    before_original = original_file.read_bytes()
    before_thumb = thumb_file.read_bytes()
    photo = Photo(
        place_id=place.id,
        original_path=original_path,
        public_path=f"/api/places/{place.id}/photos/photo-id/media/image",
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
    assert report["issues"][0]["code"] == "photo_original_immutable"
    assert report["summary"]["actions"]["applied"] == 0
    assert original_file.read_bytes() == before_original
    assert thumb_file.read_bytes() == before_thumb


def test_memory_redaction_updates_private_public_and_thumbnail(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    original_path = f"memories/{place.id}/memory-original.jpg"
    public_path = f"memories/{place.id}/memory.jpg"
    thumb_path = f"memories/{place.id}/memory-thumb.jpg"
    original_file = write_detailed_image(private_root, original_path)
    public_file = write_detailed_image(public_root, public_path)
    thumb_file = write_detailed_image(public_root, thumb_path)
    memory = Memory(
        place_id=place.id,
        caption="Pamiątka",
        memory_text="Wspomnienie",
        original_path=original_path,
        public_path=f"/media/{public_path}",
        thumb_path=f"/media/{thumb_path}",
        status="approved",
        claim_token_hash=claim_token_hash("secret-token"),
    )
    session.add(memory)
    session.commit()
    session.refresh(memory)

    report = redact_media_image(
        session,
        kind="memory",
        media_id=memory.id,
        shapes=[RedactionRegion(left=0.25, top=0.25, right=0.75, bottom=0.75)],
        apply_changes=True,
    )

    assert report["status"] == "ok"
    assert report["summary"]["actions"]["applied"] == 3
    assert_blurred(pixel(original_file, (40, 40)))
    assert_blurred(pixel(public_file, (40, 40)))
    assert_light(pixel(public_file, (1, 1)))
    with Image.open(thumb_file) as image:
        assert image.size == (520, 520)


def test_memory_redaction_supports_polygons(client_session, tmp_path: Path) -> None:
    _client, session = client_session
    place = create_place(session)
    original_path = f"memories/{place.id}/polygon-original.jpg"
    public_path = f"memories/{place.id}/polygon.jpg"
    thumb_path = f"memories/{place.id}/polygon-thumb.jpg"
    write_detailed_image(tmp_path / "private", original_path)
    public_file = write_detailed_image(tmp_path / "public", public_path)
    write_detailed_image(tmp_path / "public", thumb_path)
    memory = Memory(
        place_id=place.id,
        caption="Pamiątka",
        memory_text="Wspomnienie",
        original_path=original_path,
        public_path=f"/media/{public_path}",
        thumb_path=f"/media/{thumb_path}",
        status="approved",
        claim_token_hash=claim_token_hash("secret-token"),
    )
    session.add(memory)
    session.commit()
    session.refresh(memory)

    report = redact_media_image(
        session,
        kind="memory",
        media_id=memory.id,
        shapes=[RedactionPolygon(points=((0.1, 0.1), (0.9, 0.1), (0.5, 0.9)))],
        apply_changes=True,
    )

    assert report["status"] == "ok"
    assert_blurred(pixel(public_file, (40, 25)))
