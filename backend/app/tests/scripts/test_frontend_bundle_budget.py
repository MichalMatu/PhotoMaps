import importlib.util
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT_DIR / "scripts" / "quality" / "check_frontend_bundle.py"


def load_bundle_module():
    spec = importlib.util.spec_from_file_location("check_frontend_bundle", SCRIPT_PATH)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_asset(dist_dir: Path, name: str, content: bytes) -> None:
    path = dist_dir / "assets" / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def test_frontend_bundle_budget_reports_asset_sizes(tmp_path: Path) -> None:
    module = load_bundle_module()
    dist_dir = tmp_path / "dist"
    write_asset(dist_dir, "index.js", b"console.log('PhotoMap');")
    write_asset(dist_dir, "index.css", b".map{display:block}")
    write_asset(dist_dir, "logo.svg", b"<svg />")

    report = module.build_report(
        dist_dir,
        css_budget=module.AssetBudget(max_gzip_bytes=1024, max_minified_bytes=1024),
        js_budget=module.AssetBudget(max_gzip_bytes=1024, max_minified_bytes=1024),
    )

    assert report["status"] == "ok"
    assert [asset["path"] for asset in report["assets"]] == ["assets/index.css", "assets/index.js"]
    assert all(asset["gzip_bytes"] > 0 for asset in report["assets"])


def test_frontend_bundle_budget_fails_on_minified_or_gzip_violation(tmp_path: Path) -> None:
    module = load_bundle_module()
    dist_dir = tmp_path / "dist"
    write_asset(dist_dir, "index.js", b"x" * 64)

    report = module.build_report(
        dist_dir,
        css_budget=module.AssetBudget(max_gzip_bytes=1024, max_minified_bytes=1024),
        js_budget=module.AssetBudget(max_gzip_bytes=1, max_minified_bytes=1),
    )

    assert report["status"] == "error"
    assert {violation["metric"] for violation in report["violations"]} == {"gzip", "minified"}
    assert {violation["path"] for violation in report["violations"]} == {"assets/index.js"}
