from __future__ import annotations

from typing import Any

from app.schemas.local_data import (
    LocalDataCleanupActionRead,
    LocalDataCleanupRead,
    LocalDataDiagnosticsRead,
    LocalDataDiagnosticsSummary,
    LocalDataIssueCounts,
    LocalDataIssueRead,
    LocalDataIssueSummary,
    LocalDataMediaSummary,
    LocalDataPlaceSummary,
    LocalDataPublicPayloadSummary,
    LocalDataStorageSummary,
)


def local_data_issue_to_read(issue: dict[str, Any]) -> LocalDataIssueRead:
    return LocalDataIssueRead(
        severity=issue["severity"],
        code=issue["code"],
        target=issue["target"],
        message=issue["message"],
    )


def local_data_diagnostics_to_read(report: dict[str, Any]) -> LocalDataDiagnosticsRead:
    summary = report["summary"]
    issue_counts = summary["issues"]["by_severity"]
    return LocalDataDiagnosticsRead(
        generated_at=report["generated_at"],
        status=report["status"],
        summary=LocalDataDiagnosticsSummary(
            photos=LocalDataMediaSummary(**summary["photos"]),
            memories=LocalDataMediaSummary(**summary["memories"]),
            places=LocalDataPlaceSummary(**summary["places"]),
            public_payloads=LocalDataPublicPayloadSummary(**summary["public_payloads"]),
            storage=LocalDataStorageSummary(**summary["storage"]),
            issues=LocalDataIssueSummary(
                total=summary["issues"]["total"],
                by_severity=LocalDataIssueCounts(
                    error=issue_counts["error"],
                    warning=issue_counts["warning"],
                    info=issue_counts["info"],
                ),
            ),
        ),
        issues=[local_data_issue_to_read(issue) for issue in report["issues"]],
    )


def local_data_cleanup_action_to_read(action: dict[str, Any]) -> LocalDataCleanupActionRead:
    return LocalDataCleanupActionRead(
        action=action["action"],
        applied=action["applied"],
        relative_path=action["relative_path"],
        storage=action["storage"],
        status=action.get("status", "planned"),
    )


def local_data_cleanup_to_read(report: dict[str, Any]) -> LocalDataCleanupRead:
    return LocalDataCleanupRead(
        mode=report["mode"],
        status=report["status"],
        actions=[local_data_cleanup_action_to_read(action) for action in report["actions"]],
        diagnostics=local_data_diagnostics_to_read(report["diagnostics"]),
        diagnostics_before=local_data_diagnostics_to_read(report["diagnostics_before"])
        if report["diagnostics_before"]
        else None,
    )
