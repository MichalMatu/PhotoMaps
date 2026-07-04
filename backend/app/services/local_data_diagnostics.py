from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

from sqlmodel import Session, select

from app.models.memory import Memory
from app.models.photo import Photo
from app.models.place import Place
from app.services.local_data_diagnostics_common import IssueList, now_iso
from app.services.local_data_diagnostics_domain import audit_places, audit_reference_statuses
from app.services.local_data_diagnostics_media import audit_memories, audit_photos
from app.services.local_data_diagnostics_payloads import audit_public_payloads
from app.services.local_data_diagnostics_storage import audit_storage_roots


def run_local_data_diagnostics(
    session: Session,
    *,
    private_storage_dir: Path,
    public_storage_dir: Path,
    check_images: bool = True,
) -> dict[str, Any]:
    issues: IssueList = []
    expected_private: set[str] = set()
    expected_public: set[str] = set()

    places = {place.id: place for place in session.exec(select(Place)).all()}
    photos = session.exec(select(Photo)).all()
    memories = session.exec(select(Memory)).all()

    photo_summary = audit_photos(
        photos,
        places,
        private_storage_dir,
        public_storage_dir,
        expected_private,
        expected_public,
        issues,
        check_images=check_images,
    )
    memory_summary = audit_memories(
        memories,
        places,
        private_storage_dir,
        public_storage_dir,
        expected_private,
        expected_public,
        issues,
        check_images=check_images,
    )
    place_summary = audit_places(places, photos, memories, issues)
    reference_summary = audit_reference_statuses(session, places, photos, memories, issues)
    public_payload_summary = audit_public_payloads(session, places, photos, memories, issues)
    storage_summary = audit_storage_roots(
        private_storage_dir,
        public_storage_dir,
        expected_private,
        expected_public,
        issues,
        check_images=check_images,
    )

    by_severity = Counter(issue["severity"] for issue in issues)
    status = "error" if by_severity["error"] else "warning" if by_severity["warning"] else "ok"
    return {
        "generated_at": now_iso(),
        "status": status,
        "roots": {
            "private_storage_dir": private_storage_dir.as_posix(),
            "public_storage_dir": public_storage_dir.as_posix(),
        },
        "checks": {"images": check_images},
        "summary": {
            "photos": photo_summary,
            "memories": memory_summary,
            "places": place_summary,
            "references": reference_summary,
            "public_payloads": public_payload_summary,
            "storage": storage_summary,
            "issues": {
                "total": len(issues),
                "by_severity": {key: int(by_severity[key]) for key in ("error", "warning", "info")},
            },
        },
        "issues": issues,
    }


def format_local_data_diagnostics(report: dict[str, Any]) -> str:
    summary = report["summary"]
    issues = summary["issues"]["by_severity"]
    lines = [
        "PhotoMap local data diagnostics",
        f"Status: {str(report['status']).upper()}",
        f"Photos: {summary['photos']['records']} records, {summary['photos']['approved']} approved",
        f"Memories: {summary['memories']['records']} records, {summary['memories']['approved']} approved",
        f"Places: {summary['places']['records']} records",
        (
            "Storage: "
            f"{summary['storage']['private_files']} private files, "
            f"{summary['storage']['public_files']} public files, "
            f"{summary['storage']['orphan_private_files']} orphan private, "
            f"{summary['storage']['orphan_public_files']} orphan public"
        ),
        f"Public payloads checked: {summary['public_payloads']['checked']}",
        f"Problems: {issues['error']} error, {issues['warning']} warning, {issues['info']} info",
    ]
    if report["issues"]:
        lines.append("")
        lines.append("Problem list:")
        for issue in report["issues"]:
            lines.append(f"- [{issue['severity'].upper()}] {issue['code']} {issue['target']} - {issue['message']}")
    return "\n".join(lines)


def write_diagnostics_json(path: Path, report: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
