import importlib.util
import subprocess
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.runtime import FrontendSeoMetadata, frontend_static_file, inject_frontend_seo, mount_frontend_dist

ROOT_DIR = Path(__file__).resolve().parents[4]


def test_mount_frontend_dist_serves_spa_without_hiding_api_404(tmp_path: Path) -> None:
    dist_dir = tmp_path / "dist"
    assets_dir = dist_dir / "assets"
    assets_dir.mkdir(parents=True)
    (dist_dir / "index.html").write_text('<div id="root">PhotoMap</div>', encoding="utf-8")
    (assets_dir / "app.js").write_text("console.log('PhotoMap');", encoding="utf-8")

    app = FastAPI()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    mount_frontend_dist(app, dist_dir)

    client = TestClient(app)
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/").text == '<div id="root">PhotoMap</div>'
    assert client.get("/places/ostrow-tumski").text == '<div id="root">PhotoMap</div>'
    assert client.get("/assets/app.js").text == "console.log('PhotoMap');"
    assert client.get("/api/missing").status_code == 404


def test_mount_frontend_dist_can_inject_route_seo_metadata(tmp_path: Path) -> None:
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir(parents=True)
    (dist_dir / "index.html").write_text(
        "\n".join(
            [
                "<html>",
                "<head>",
                "    <!-- photomap-seo:start -->",
                "    <title>PhotoMap</title>",
                "    <!-- photomap-seo:end -->",
                "</head>",
                '<body><div id="root"></div></body>',
                "</html>",
            ]
        ),
        encoding="utf-8",
    )

    app = FastAPI()

    def seo_provider(path, request):
        return FrontendSeoMetadata(
            title="Ostrów Tumski | PhotoMap",
            description="Zobacz Ostrów Tumski w PhotoMap.",
            canonical_url=f"{str(request.base_url).rstrip('/')}{path}",
            image_url="http://testserver/media/photos/ostrow.jpg",
            structured_data=[{"@context": "https://schema.org", "@type": "Place", "name": "Ostrów Tumski"}],
        )

    mount_frontend_dist(app, dist_dir, seo_provider)

    response = TestClient(app).get("/places/ostrow-tumski")

    assert response.status_code == 200
    assert "<title>Ostrów Tumski | PhotoMap</title>" in response.text
    assert 'content="Zobacz Ostrów Tumski w PhotoMap."' in response.text
    assert 'property="og:image" content="http://testserver/media/photos/ostrow.jpg"' in response.text
    assert '"@type":"Place"' in response.text
    assert "<title>PhotoMap</title>" not in response.text


def test_injected_structured_data_uses_the_response_csp_nonce() -> None:
    index_html = "<!-- photomap-seo:start --><title>Old</title><!-- photomap-seo:end -->"
    metadata = FrontendSeoMetadata(
        title="PhotoMap",
        description="Wizualna mapa miejsc.",
        canonical_url="https://photomap.pl/",
        structured_data=[{"@context": "https://schema.org", "@type": "WebSite"}],
    )

    rendered = inject_frontend_seo(index_html, metadata, "test-csp-nonce")

    assert '<meta name="csp-nonce" content="test-csp-nonce" />' in rendered
    assert '<script type="application/ld+json" nonce="test-csp-nonce">' in rendered


def test_mount_frontend_dist_reloads_index_after_frontend_rebuild(tmp_path: Path) -> None:
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir(parents=True)
    index_file = dist_dir / "index.html"
    index_file.write_text(
        "<html><head><!-- photomap-seo:start --><title>Old</title><!-- photomap-seo:end --></head>"
        '<body><script type="module" src="/assets/index-old.js"></script></body></html>',
        encoding="utf-8",
    )

    app = FastAPI()

    def seo_provider(path, request):
        return FrontendSeoMetadata(
            title="PhotoMap",
            description="Wizualna mapa miejsc.",
            canonical_url=f"{str(request.base_url).rstrip('/')}{path}",
        )

    mount_frontend_dist(app, dist_dir, seo_provider)
    index_file.write_text(
        "<html><head><!-- photomap-seo:start --><title>New</title><!-- photomap-seo:end --></head>"
        '<body><script type="module" src="/assets/index-new.js"></script></body></html>',
        encoding="utf-8",
    )

    response = TestClient(app).get("/places/rynek")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-cache"
    assert "/assets/index-new.js" in response.text
    assert "/assets/index-old.js" not in response.text


def test_frontend_static_file_stays_inside_dist(tmp_path: Path) -> None:
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir()
    (dist_dir / "index.html").write_text("PhotoMap", encoding="utf-8")
    (tmp_path / "outside.txt").write_text("private", encoding="utf-8")

    assert frontend_static_file(dist_dir, "index.html") == (dist_dir / "index.html").resolve()
    assert frontend_static_file(dist_dir, "../outside.txt") is None


def test_root_server_entrypoint_compiles() -> None:
    response = subprocess.run(
        [sys.executable, "-m", "py_compile", str(ROOT_DIR / "server.py")],
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )

    assert response.returncode == 0, response.stderr


def test_root_server_loads_local_env_without_overriding_existing_values(monkeypatch, tmp_path: Path) -> None:
    spec = importlib.util.spec_from_file_location("photomap_server", ROOT_DIR / "server.py")
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "# local runtime config",
                "ADMIN_TOKEN=from-file",
                "CLAIM_TOKEN_SECRET='secret-from-file'",
                "IGNORED_LINE",
            ]
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("ADMIN_TOKEN", "from-env")
    monkeypatch.delenv("CLAIM_TOKEN_SECRET", raising=False)
    module.load_local_env(env_file)

    assert module.os.environ["ADMIN_TOKEN"] == "from-env"
    assert module.os.environ["CLAIM_TOKEN_SECRET"] == "secret-from-file"


def test_public_server_recovers_photo_quarantine_after_migrations(monkeypatch, tmp_path: Path) -> None:
    spec = importlib.util.spec_from_file_location("photomap_server_recovery", ROOT_DIR / "server.py")
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    events: list[str] = []

    monkeypatch.setattr(module, "AUTOSTART_DISABLED_FILE", tmp_path / "autostart-disabled")
    monkeypatch.setattr(module, "load_local_env", lambda: None)
    monkeypatch.setattr(module, "create_app", lambda: events.append("create-app") or object())
    monkeypatch.setattr(module, "run_migrations", lambda: events.append("migrations"))
    monkeypatch.setattr(
        module,
        "recover_photo_media_quarantine",
        lambda: events.append("quarantine-recovery") or {"discarded": 0, "restored": 0},
    )
    monkeypatch.setattr(module.uvicorn, "run", lambda *_args, **_kwargs: events.append("uvicorn"))

    assert module.main() == 0
    assert events.index("migrations") < events.index("quarantine-recovery") < events.index("uvicorn")
