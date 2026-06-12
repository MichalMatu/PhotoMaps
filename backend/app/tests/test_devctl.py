import json
import os
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
DEVCTL = ROOT_DIR / "scripts" / "devctl.sh"
E2E_SCRIPT = ROOT_DIR / "scripts" / "quality" / "e2e.sh"
FRONTEND_PACKAGE = ROOT_DIR / "frontend" / "package.json"
VISUAL_E2E_SPEC = ROOT_DIR / "frontend" / "e2e" / "visual-regression.spec.ts"


def run_devctl(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.update(
        {
            "BACKEND_PORT": "18123",
            "DEV_DIR": str(tmp_path / "dev"),
            "DEV_LOG_LINES": "1",
            "FRONTEND_PORT": "15174",
        }
    )
    return subprocess.run(
        [str(DEVCTL), *args],
        check=False,
        capture_output=True,
        env=env,
        text=True,
        timeout=10,
    )


def test_devctl_help_status_and_logs_do_not_require_running_servers(tmp_path: Path) -> None:
    help_response = run_devctl(tmp_path, "help")
    status_response = run_devctl(tmp_path, "status")
    logs_response = run_devctl(tmp_path, "logs")

    assert help_response.returncode == 0
    assert "make start" in help_response.stdout
    assert status_response.returncode == 0
    assert "Backend: nieuruchomiony" in status_response.stdout
    assert "Frontend: nieuruchomiony" in status_response.stdout
    assert logs_response.returncode == 0
    assert "== backend ==" in logs_response.stdout
    assert "brak logów" in logs_response.stdout


def test_devctl_stop_cleans_stale_pid_files_without_running_servers(tmp_path: Path) -> None:
    dev_dir = tmp_path / "dev"
    dev_dir.mkdir()
    backend_pid = dev_dir / "backend.pid"
    frontend_pid = dev_dir / "frontend.pid"
    backend_pid.write_text("999999", encoding="utf-8")
    frontend_pid.write_text("999998", encoding="utf-8")

    response = run_devctl(tmp_path, "stop")

    assert response.returncode == 0
    assert not backend_pid.exists()
    assert not frontend_pid.exists()


def test_frontend_e2e_uses_isolated_runner() -> None:
    package_json = json.loads(FRONTEND_PACKAGE.read_text(encoding="utf-8"))
    script = E2E_SCRIPT.read_text(encoding="utf-8")

    assert package_json["scripts"]["test:e2e"] == "../scripts/quality/e2e.sh"
    assert 'DEV_DIR="$ROOT_DIR/.dev/e2e"' in script
    assert 'DATABASE_URL="sqlite:///$DEV_DIR/backend-data/app.db"' in script
    assert 'PHOTOMAP_DATA_DIR="$DEV_DIR/backend-data"' in script
    assert "./node_modules/.bin/playwright test --config playwright.config.ts" in script
    assert "npm run test:e2e" not in script


def test_visual_e2e_uses_runner_api_url() -> None:
    spec = VISUAL_E2E_SPEC.read_text(encoding="utf-8")

    assert 'const API_URL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";' in spec
