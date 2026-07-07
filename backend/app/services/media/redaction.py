from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageOps
from sqlmodel import Session

from app.models.memory import Memory
from app.models.photo import Photo
from app.services.media import images


@dataclass(frozen=True)
class RedactionRegion:
    left: float
    top: float
    right: float
    bottom: float


@dataclass(frozen=True)
class RedactionPolygon:
    points: tuple[tuple[float, float], ...]


RedactionShape = RedactionRegion | RedactionPolygon


def parse_redaction_region(value: str) -> RedactionRegion:
    parts = [part.strip() for part in value.split(",")]
    if len(parts) != 4:
        raise ValueError("Redaction region must have four comma-separated numbers")
    left, top, right, bottom = (float(part) for part in parts)
    region = RedactionRegion(left=left, top=top, right=right, bottom=bottom)
    validate_redaction_region(region)
    return region


def parse_redaction_polygon(value: str) -> RedactionPolygon:
    parts = [part.strip() for part in value.split(",")]
    if len(parts) < 6 or len(parts) % 2 != 0:
        raise ValueError("Redaction polygon must have at least three x,y points")
    numbers = [float(part) for part in parts]
    points = tuple((numbers[index], numbers[index + 1]) for index in range(0, len(numbers), 2))
    polygon = RedactionPolygon(points=points)
    validate_redaction_polygon(polygon)
    return polygon


def validate_redaction_region(region: RedactionRegion) -> None:
    values = (region.left, region.top, region.right, region.bottom)
    if any(value < 0 or value > 1 for value in values):
        raise ValueError("Redaction region values must be between 0 and 1")
    if region.left >= region.right or region.top >= region.bottom:
        raise ValueError("Redaction region must have positive width and height")


def validate_redaction_polygon(polygon: RedactionPolygon) -> None:
    if len(polygon.points) < 3:
        raise ValueError("Redaction polygon must have at least three points")
    for x_value, y_value in polygon.points:
        if x_value < 0 or x_value > 1 or y_value < 0 or y_value > 1:
            raise ValueError("Redaction polygon values must be between 0 and 1")


def validate_redaction_shapes(shapes: list[RedactionShape]) -> None:
    if not shapes:
        raise ValueError("At least one redaction shape is required")
    for shape in shapes:
        if isinstance(shape, RedactionRegion):
            validate_redaction_region(shape)
        else:
            validate_redaction_polygon(shape)


def redact_media_image(
    session: Session,
    *,
    kind: str,
    media_id: str,
    shapes: list[RedactionShape],
    apply_changes: bool,
) -> dict[str, Any]:
    validate_redaction_shapes(shapes)
    issues: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    media = media_for(session, kind, media_id)
    if media is None:
        issues.append({"severity": "error", "code": "media_missing", "message": "Media record does not exist."})
        return redaction_report(kind, media_id, apply_changes, actions, issues)

    paths = media_paths(media)
    private_path = paths["private_original"]
    public_path = paths["public"]
    thumb_path = paths["thumb"]

    if not private_path.exists():
        issues.append(
            {
                "severity": "warning",
                "code": "private_original_missing",
                "message": "Private original is missing; public derivatives were still checked.",
                "path": private_path.as_posix(),
            }
        )

    requires_public_derivatives = media.status == "approved"
    public_ready = public_path is not None and public_path.exists()
    thumb_ready = thumb_path is not None and thumb_path.exists()
    if requires_public_derivatives and not public_ready:
        issues.append(
            {
                "severity": "error",
                "code": "public_missing",
                "message": "Media derivative is missing.",
                "path": public_path.as_posix() if public_path is not None else "",
            }
        )
    if requires_public_derivatives and not thumb_ready:
        issues.append(
            {
                "severity": "error",
                "code": "thumb_missing",
                "message": "Media derivative is missing.",
                "path": thumb_path.as_posix() if thumb_path is not None else "",
            }
        )

    if any(issue["severity"] == "error" for issue in issues):
        return redaction_report(kind, media_id, apply_changes, actions, issues)

    if private_path.exists():
        actions.append(redact_path(private_path, "private_original", shapes, apply_changes))

    if public_ready and public_path is not None:
        actions.append(redact_path(public_path, "public", shapes, apply_changes))
    if public_ready and thumb_ready and public_path is not None and thumb_path is not None:
        actions.append(regenerate_thumb_path(public_path, thumb_path, apply_changes))

    return redaction_report(kind, media_id, apply_changes, actions, issues)


def media_for(session: Session, kind: str, media_id: str) -> Photo | Memory | None:
    if kind == "photo":
        return session.get(Photo, media_id)
    if kind == "memory":
        return session.get(Memory, media_id)
    raise ValueError("Unsupported media kind")


def media_paths(media: Photo | Memory) -> dict[str, Path | None]:
    return {
        "private_original": images.storage_path(images.PRIVATE_STORAGE_DIR, media.original_path),
        "public": images.public_storage_path(media.public_path) if media.public_path is not None else None,
        "thumb": images.public_storage_path(media.thumb_path) if media.thumb_path is not None else None,
    }


def redact_path(
    path: Path,
    label: str,
    shapes: list[RedactionShape],
    apply_changes: bool,
) -> dict[str, Any]:
    with Image.open(path) as image:
        if apply_changes:
            redacted = blurred_redaction_image(image, shapes)
            save_redacted_image(redacted, path, image.format)
    return {
        "action": "redact_image",
        "applied": apply_changes,
        "label": label,
        "path": path.as_posix(),
        "shapes": len(shapes),
    }


def blurred_redaction_image(image: Image.Image, shapes: list[RedactionShape]) -> Image.Image:
    redacted = image.copy()
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    for shape in shapes:
        if isinstance(shape, RedactionRegion):
            draw.rectangle(pixel_box(shape, image.width, image.height), fill=255)
        else:
            draw.polygon(pixel_polygon(shape, image.width, image.height), fill=255)

    blur_radius = redaction_blur_radius(image.width, image.height)
    blurred = redacted.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    redacted.paste(blurred, mask=mask)
    return redacted


def redaction_blur_radius(width: int, height: int) -> int:
    return max(14, min(80, round(max(width, height) * 0.035)))


def regenerate_thumb_path(public_path: Path, thumb_path: Path, apply_changes: bool) -> dict[str, Any]:
    with Image.open(public_path) as public_image:
        output_format = images.public_image_format(public_image)
        if apply_changes:
            thumb_image = ImageOps.fit(
                public_image.copy(),
                images.THUMB_SIZE,
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
            images.save_thumbnail_image(thumb_image, thumb_path, output_format)
    return {
        "action": "regenerate_thumb",
        "applied": apply_changes,
        "label": "thumb",
        "path": thumb_path.as_posix(),
        "shapes": 0,
    }


def pixel_box(region: RedactionRegion, width: int, height: int) -> tuple[int, int, int, int]:
    left = max(0, min(width, round(region.left * width)))
    top = max(0, min(height, round(region.top * height)))
    right = max(left + 1, min(width, round(region.right * width)))
    bottom = max(top + 1, min(height, round(region.bottom * height)))
    return left, top, right, bottom


def pixel_polygon(polygon: RedactionPolygon, width: int, height: int) -> list[tuple[int, int]]:
    return [
        (
            max(0, min(width, round(x_value * width))),
            max(0, min(height, round(y_value * height))),
        )
        for x_value, y_value in polygon.points
    ]


def save_redacted_image(image: Image.Image, path: Path, image_format: str | None) -> None:
    output_format = image_format or path.suffix.removeprefix(".").upper() or "JPEG"
    if output_format == "JPEG" and image.mode in {"RGBA", "LA"}:
        image = image.convert("RGB")
    images.save_public_image(image, path, output_format)


def redaction_report(
    kind: str,
    media_id: str,
    apply_changes: bool,
    actions: list[dict[str, Any]],
    issues: list[dict[str, Any]],
) -> dict[str, Any]:
    issue_counts = {
        "error": sum(1 for item in issues if item["severity"] == "error"),
        "warning": sum(1 for item in issues if item["severity"] == "warning"),
        "info": sum(1 for item in issues if item["severity"] == "info"),
    }
    return {
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "mode": "apply" if apply_changes else "dry-run",
        "status": "error" if issue_counts["error"] else "warning" if issue_counts["warning"] else "ok",
        "kind": kind,
        "id": media_id,
        "summary": {
            "actions": {"total": len(actions), "applied": sum(1 for item in actions if item["applied"])},
            "issues": {"total": len(issues), "by_severity": issue_counts},
        },
        "actions": actions,
        "issues": issues,
    }


def format_redaction_report(report: dict[str, Any]) -> str:
    actions = report["summary"]["actions"]
    issues = report["summary"]["issues"]["by_severity"]
    lines = [
        "PhotoMap media redaction",
        f"Mode: {report['mode']}",
        f"Status: {report['status'].upper()}",
        f"Media: {report['kind']}:{report['id']}",
        f"Actions: {actions['applied']} applied, {actions['total']} total",
        f"Problems: {issues['error']} error, {issues['warning']} warning, {issues['info']} info",
    ]
    if report["actions"]:
        lines.append("")
        lines.append("Action list:")
        for item in report["actions"]:
            marker = "applied" if item["applied"] else "planned"
            lines.append(f"- [{marker}] {item['label']} {item['path']} ({item['shapes']} shape)")
    if report["issues"]:
        lines.append("")
        lines.append("Problem list:")
        for item in report["issues"]:
            lines.append(f"- [{item['severity'].upper()}] {item['code']} - {item['message']}")
    return "\n".join(lines)
