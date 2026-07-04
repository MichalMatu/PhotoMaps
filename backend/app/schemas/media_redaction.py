from typing import Literal

from sqlmodel import Field, SQLModel

from app.schemas.contract_types import MapPreviewKind

MediaRedactionMode = Literal["apply", "dry-run"]
MediaRedactionStatus = Literal["ok", "warning", "error"]
MediaRedactionIssueSeverity = Literal["error", "warning", "info"]


class RedactionPointPayload(SQLModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class RedactionRectanglePayload(SQLModel):
    left: float = Field(ge=0, le=1)
    top: float = Field(ge=0, le=1)
    right: float = Field(ge=0, le=1)
    bottom: float = Field(ge=0, le=1)


class MediaRedactionPayload(SQLModel):
    rectangles: list[RedactionRectanglePayload] = Field(default_factory=list)
    polygons: list[list[RedactionPointPayload]] = Field(default_factory=list)


class MediaRedactionAction(SQLModel):
    action: str
    applied: bool
    label: str
    path: str
    shapes: int


class MediaRedactionIssue(SQLModel):
    severity: MediaRedactionIssueSeverity
    code: str
    message: str
    path: str | None = None


class MediaRedactionActionSummary(SQLModel):
    total: int
    applied: int


class MediaRedactionIssueSeveritySummary(SQLModel):
    error: int
    warning: int
    info: int


class MediaRedactionIssueSummary(SQLModel):
    total: int
    by_severity: MediaRedactionIssueSeveritySummary


class MediaRedactionSummary(SQLModel):
    actions: MediaRedactionActionSummary
    issues: MediaRedactionIssueSummary


class MediaRedactionReport(SQLModel):
    generated_at: str
    mode: MediaRedactionMode
    status: MediaRedactionStatus
    kind: MapPreviewKind
    id: str
    summary: MediaRedactionSummary
    actions: list[MediaRedactionAction]
    issues: list[MediaRedactionIssue]
