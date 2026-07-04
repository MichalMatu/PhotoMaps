from pathlib import Path

from PIL import Image

from app.services import orphan_media_cleanup
from app.tests.support import ADMIN_HEADERS


def write_image(root: Path, relative_path: str) -> Path:
    path = root / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (12, 12), (24, 96, 128)).save(path, "JPEG")
    return path


def configure_storage(monkeypatch, tmp_path: Path) -> tuple[Path, Path]:
    private_root = tmp_path / "private-storage"
    public_root = tmp_path / "public-storage"
    private_root.mkdir()
    public_root.mkdir()
    monkeypatch.setattr(orphan_media_cleanup, "PRIVATE_STORAGE_DIR", private_root)
    monkeypatch.setattr(orphan_media_cleanup, "PUBLIC_STORAGE_DIR", public_root)
    return private_root, public_root


def test_admin_local_data_requires_token(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/local-data/diagnostics")

    assert response.status_code == 401


def test_admin_can_diagnose_and_delete_orphan_media(client_session, monkeypatch, tmp_path: Path) -> None:
    client, _session = client_session
    private_root, public_root = configure_storage(monkeypatch, tmp_path)
    private_file = write_image(private_root, "memories/place-1/orphan-original.jpg")
    public_file = write_image(public_root, "memories/place-1/orphan.jpg")

    diagnostics_response = client.get("/api/admin/local-data/diagnostics", headers=ADMIN_HEADERS)
    cleanup_response = client.post("/api/admin/local-data/orphan-media-cleanup", headers=ADMIN_HEADERS)

    assert diagnostics_response.status_code == 200
    diagnostics = diagnostics_response.json()
    assert diagnostics["status"] == "warning"
    assert diagnostics["summary"]["storage"]["orphan_private_files"] == 1
    assert diagnostics["summary"]["storage"]["orphan_public_files"] == 1
    assert "roots" not in diagnostics

    assert cleanup_response.status_code == 200
    cleanup = cleanup_response.json()
    assert cleanup["status"] == "ok"
    assert cleanup["diagnostics"]["summary"]["storage"]["orphan_private_files"] == 0
    assert cleanup["diagnostics"]["summary"]["storage"]["orphan_public_files"] == 0
    assert {action["status"] for action in cleanup["actions"]} == {"deleted"}
    assert all("path" not in action for action in cleanup["actions"])
    assert not private_file.exists()
    assert not public_file.exists()
