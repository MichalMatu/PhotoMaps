from fastapi import HTTPException
from sqlmodel import Session

from app.schemas.media_redaction import MediaRedactionPayload, MediaRedactionReport
from app.services.media.redaction import RedactionPolygon, RedactionRegion, redact_media_image


def redact_admin_media(
    kind: str, media_id: str, payload: MediaRedactionPayload, session: Session
) -> MediaRedactionReport:
    try:
        report = redact_media_image(
            session,
            kind=kind,
            media_id=media_id,
            shapes=redaction_shapes_from_payload(payload),
            apply_changes=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if report["status"] == "error":
        first_issue = report["issues"][0] if report["issues"] else {}
        status_code = 404 if first_issue.get("code") == "media_missing" else 422
        raise HTTPException(status_code=status_code, detail=first_issue.get("message", "Media redaction failed"))

    return MediaRedactionReport.model_validate(report)


def redaction_shapes_from_payload(payload: MediaRedactionPayload) -> list[RedactionRegion | RedactionPolygon]:
    shapes: list[RedactionRegion | RedactionPolygon] = [
        RedactionRegion(left=rectangle.left, top=rectangle.top, right=rectangle.right, bottom=rectangle.bottom)
        for rectangle in payload.rectangles
    ]
    shapes.extend(
        RedactionPolygon(points=tuple((point.x, point.y) for point in polygon)) for polygon in payload.polygons
    )
    return shapes
