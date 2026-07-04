import importlib.util
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT_DIR / "scripts" / "quality" / "css_token_gate.py"


def load_css_token_gate_module():
    spec = importlib.util.spec_from_file_location("css_token_gate", SCRIPT_PATH)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_admin_pill_geometry_uses_shared_token_contract() -> None:
    module = load_css_token_gate_module()

    assert module.validate_admin_pill_contract() == []


def test_admin_section_tab_geometry_uses_shared_token_contract() -> None:
    module = load_css_token_gate_module()

    assert module.validate_admin_section_tab_contract() == []


def test_admin_toolbar_layout_uses_shared_token_contract() -> None:
    module = load_css_token_gate_module()

    assert module.validate_admin_toolbar_contract() == []
