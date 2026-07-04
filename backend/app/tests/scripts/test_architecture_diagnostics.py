import importlib.util
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT_DIR / "scripts" / "diagnose_architecture.py"


def load_architecture_module():
    spec = importlib.util.spec_from_file_location("diagnose_architecture", SCRIPT_PATH)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_architecture_report_has_expected_sections() -> None:
    module = load_architecture_module()

    report = module.build_report()

    assert report["summary"]["source_files"] > 0
    assert report["biggest_files"]
    assert "http_endpoints" in report
    assert "risky_patterns" in report
    assert "tool_availability" in report
    assert "parse_errors" in report
    assert "# PhotoMap Architecture Diagnostics" in module.format_markdown(report)
