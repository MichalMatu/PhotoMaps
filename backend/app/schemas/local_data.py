from typing import Literal

from sqlmodel import SQLModel


class LocalDataIssueCounts(SQLModel):
    error: int
    warning: int
    info: int


class LocalDataIssueSummary(SQLModel):
    total: int
    by_severity: LocalDataIssueCounts


class LocalDataIssueRead(SQLModel):
    severity: Literal["error", "warning", "info"]
    code: str
    target: str
    message: str


class LocalDataMediaSummary(SQLModel):
    records: int
    approved: int
    pending: int
    rejected: int
    unknown_status: int


class LocalDataPlaceSummary(SQLModel):
    records: int
    published: int
    draft: int
    archived: int
    unknown_status: int


class LocalDataPublicPayloadSummary(SQLModel):
    checked: int


class LocalDataStorageSummary(SQLModel):
    private_files: int
    public_files: int
    orphan_private_files: int
    orphan_public_files: int
    private_bytes: int
    public_bytes: int


class LocalDataDiagnosticsSummary(SQLModel):
    photos: LocalDataMediaSummary
    memories: LocalDataMediaSummary
    places: LocalDataPlaceSummary
    public_payloads: LocalDataPublicPayloadSummary
    storage: LocalDataStorageSummary
    issues: LocalDataIssueSummary


class LocalDataDiagnosticsRead(SQLModel):
    generated_at: str
    status: Literal["ok", "warning", "error"]
    summary: LocalDataDiagnosticsSummary
    issues: list[LocalDataIssueRead]


class LocalDataCleanupActionRead(SQLModel):
    action: Literal["delete_file"]
    applied: bool
    relative_path: str
    storage: Literal["private", "public"]
    status: Literal["planned", "deleted", "missing", "not-file"]


class LocalDataCleanupRead(SQLModel):
    mode: Literal["apply", "dry-run"]
    status: Literal["ok", "warning", "error"]
    actions: list[LocalDataCleanupActionRead]
    diagnostics: LocalDataDiagnosticsRead
    diagnostics_before: LocalDataDiagnosticsRead | None
