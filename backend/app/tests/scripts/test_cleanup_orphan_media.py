import importlib.util
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT_DIR / "scripts" / "cleanup_orphan_media.py"


def load_cleanup_module():
    spec = importlib.util.spec_from_file_location("cleanup_orphan_media", SCRIPT_PATH)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def diagnostics_report(*issues: dict[str, Any], status: str = "warning") -> dict[str, Any]:
    error_count = sum(1 for issue in issues if issue["severity"] == "error")
    warning_count = sum(1 for issue in issues if issue["severity"] == "warning")
    info_count = sum(1 for issue in issues if issue["severity"] == "info")
    return {
        "generated_at": "2026-01-01T00:00:00Z",
        "status": status,
        "summary": {
            "issues": {
                "total": len(issues),
                "by_severity": {
                    "error": error_count,
                    "warning": warning_count,
                    "info": info_count,
                },
            }
        },
        "issues": list(issues),
    }


def configure_storage_roots(module, monkeypatch, tmp_path: Path) -> tuple[Path, Path]:
    private_root = tmp_path / "private"
    public_root = tmp_path / "public"
    private_root.mkdir()
    public_root.mkdir()
    monkeypatch.setattr(module, "PRIVATE_STORAGE_DIR", private_root)
    monkeypatch.setattr(module, "PUBLIC_STORAGE_DIR", public_root)
    monkeypatch.setattr(
        module,
        "ORPHAN_CODES",
        {
            "orphan_private_file": ("private", private_root),
            "orphan_public_file": ("public", public_root),
        },
    )
    return private_root, public_root


def test_cleanup_report_dry_run_lists_orphans_without_deleting(monkeypatch, tmp_path: Path) -> None:
    module = load_cleanup_module()
    private_root, public_root = configure_storage_roots(module, monkeypatch, tmp_path)
    private_file = private_root / "photos" / "place-1" / "orphan-original.jpg"
    public_file = public_root / "photos" / "place-1" / "orphan.jpg"
    ignored_file = public_root / "photos" / "keep.jpg"
    for path in (private_file, public_file, ignored_file):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"image")

    before = diagnostics_report(
        {
            "severity": "warning",
            "code": "orphan_private_file",
            "target": "private:photos/place-1/orphan-original.jpg",
            "message": "Unused private file.",
        },
        {
            "severity": "warning",
            "code": "orphan_public_file",
            "target": "public:photos/place-1/orphan.jpg",
            "message": "Unused public file.",
        },
        {
            "severity": "warning",
            "code": "image_unreadable",
            "target": "public:photos/keep.jpg",
            "message": "Unrelated warning.",
        },
    )
    monkeypatch.setattr(module, "run_diagnostics", lambda *, check_images: before)

    report = module.cleanup_report(apply_changes=False, check_images=False)

    assert report["mode"] == "dry-run"
    assert report["status"] == "warning"
    assert len(report["actions"]) == 2
    assert all(not action["applied"] for action in report["actions"])
    assert private_file.exists()
    assert public_file.exists()
    assert ignored_file.exists()


def test_cleanup_report_apply_deletes_only_orphans_when_diagnostics_has_no_errors(monkeypatch, tmp_path: Path) -> None:
    module = load_cleanup_module()
    private_root, public_root = configure_storage_roots(module, monkeypatch, tmp_path)
    private_file = private_root / "photos" / "place-1" / "orphan-original.jpg"
    public_file = public_root / "photos" / "place-1" / "orphan.jpg"
    kept_file = public_root / "photos" / "keep.jpg"
    for path in (private_file, public_file, kept_file):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"image")

    before = diagnostics_report(
        {
            "severity": "warning",
            "code": "orphan_private_file",
            "target": "private:photos/place-1/orphan-original.jpg",
            "message": "Unused private file.",
        },
        {
            "severity": "warning",
            "code": "orphan_public_file",
            "target": "public:photos/place-1/orphan.jpg",
            "message": "Unused public file.",
        },
    )
    after = diagnostics_report(status="ok")
    reports = [before, after]
    monkeypatch.setattr(module, "run_diagnostics", lambda *, check_images: reports.pop(0))

    report = module.cleanup_report(apply_changes=True, check_images=False)

    assert report["mode"] == "apply"
    assert report["status"] == "ok"
    assert report["diagnostics_before"] == before
    assert {action["status"] for action in report["actions"]} == {"deleted"}
    assert not private_file.exists()
    assert not public_file.exists()
    assert kept_file.exists()


def test_cleanup_report_apply_does_not_delete_when_diagnostics_has_errors(monkeypatch, tmp_path: Path) -> None:
    module = load_cleanup_module()
    private_root, _public_root = configure_storage_roots(module, monkeypatch, tmp_path)
    private_file = private_root / "photos" / "place-1" / "orphan-original.jpg"
    private_file.parent.mkdir(parents=True, exist_ok=True)
    private_file.write_bytes(b"image")

    before = diagnostics_report(
        {
            "severity": "error",
            "code": "photo_original_missing",
            "target": "photo:photo-1",
            "message": "Original file is missing.",
        },
        {
            "severity": "warning",
            "code": "orphan_private_file",
            "target": "private:photos/place-1/orphan-original.jpg",
            "message": "Unused private file.",
        },
        status="error",
    )
    monkeypatch.setattr(module, "run_diagnostics", lambda *, check_images: before)

    report = module.cleanup_report(apply_changes=True, check_images=False)

    assert report["status"] == "error"
    assert report["diagnostics_before"] is None
    assert len(report["actions"]) == 1
    assert "status" not in report["actions"][0]
    assert private_file.exists()
