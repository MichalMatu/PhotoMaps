import os
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[3]
DEVCTL = ROOT_DIR / "scripts" / "devctl.sh"


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
