import json
from collections.abc import Callable
from dataclasses import dataclass, field
from html import escape
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from app.core.security_headers import CSP_NONCE_STATE_ATTRIBUTE

RESERVED_FRONTEND_PATHS = (
    "/api",
    "/health",
    "/media",
    "/docs",
    "/redoc",
    "/openapi.json",
)

SEO_BLOCK_START = "<!-- photomap-seo:start -->"
SEO_BLOCK_END = "<!-- photomap-seo:end -->"
FRONTEND_HTML_HEADERS = {"Cache-Control": "no-cache"}


@dataclass(frozen=True)
class FrontendSeoMetadata:
    title: str
    description: str
    canonical_url: str
    robots: str = "index,follow,max-image-preview:large"
    image_url: str | None = None
    structured_data: list[dict] = field(default_factory=list)
    page_type: str = "website"


FrontendSeoProvider = Callable[[str, Request], FrontendSeoMetadata | None]


def frontend_static_file(dist_dir: Path, frontend_path: str) -> Path | None:
    if not frontend_path:
        return None

    dist_root = dist_dir.resolve()
    static_file = (dist_root / frontend_path).resolve()
    if not static_file.is_relative_to(dist_root) or not static_file.is_file():
        return None
    return static_file


def safe_json_for_script(data: dict) -> str:
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def render_seo_head(metadata: FrontendSeoMetadata, csp_nonce: str | None = None) -> str:
    escaped_title = escape(metadata.title, quote=False)
    escaped_description = escape(metadata.description)
    escaped_canonical_url = escape(metadata.canonical_url, quote=True)
    escaped_robots = escape(metadata.robots, quote=True)
    twitter_card = "summary_large_image" if metadata.image_url else "summary"
    tags = [
        f"<title>{escaped_title}</title>",
        f'<meta name="description" content="{escaped_description}" />',
        f'<meta name="robots" content="{escaped_robots}" />',
        '<meta name="application-name" content="PhotoMap" />',
        '<meta name="theme-color" content="#0f5f7a" />',
        '<meta property="og:site_name" content="PhotoMap" />',
        f'<meta property="og:type" content="{escape(metadata.page_type, quote=True)}" />',
        f'<meta property="og:title" content="{escape(metadata.title, quote=True)}" />',
        f'<meta property="og:description" content="{escaped_description}" />',
        f'<meta property="og:url" content="{escaped_canonical_url}" />',
        f'<meta name="twitter:card" content="{twitter_card}" />',
        f'<meta name="twitter:title" content="{escape(metadata.title, quote=True)}" />',
        f'<meta name="twitter:description" content="{escaped_description}" />',
        f'<link rel="canonical" href="{escaped_canonical_url}" />',
    ]
    if csp_nonce:
        tags.insert(1, f'<meta name="csp-nonce" content="{escape(csp_nonce, quote=True)}" />')
    if metadata.image_url:
        escaped_image_url = escape(metadata.image_url, quote=True)
        tags.insert(9, f'<meta property="og:image" content="{escaped_image_url}" />')
        tags.insert(13, f'<meta name="twitter:image" content="{escaped_image_url}" />')
    nonce_attribute = f' nonce="{escape(csp_nonce, quote=True)}"' if csp_nonce else ""
    tags.extend(
        f'<script type="application/ld+json"{nonce_attribute}>{safe_json_for_script(item)}</script>'
        for item in metadata.structured_data
    )
    return "\n".join(f"    {tag}" for tag in tags)


def inject_frontend_seo(
    index_html: str,
    metadata: FrontendSeoMetadata | None,
    csp_nonce: str | None = None,
) -> str:
    if metadata is None or SEO_BLOCK_START not in index_html or SEO_BLOCK_END not in index_html:
        return index_html

    start_index = index_html.index(SEO_BLOCK_START) + len(SEO_BLOCK_START)
    end_index = index_html.index(SEO_BLOCK_END)
    return f"{index_html[:start_index]}\n{render_seo_head(metadata, csp_nonce)}\n    {index_html[end_index:]}"


def request_csp_nonce(request: Request) -> str | None:
    nonce = getattr(request.state, CSP_NONCE_STATE_ATTRIBUTE, None)
    return nonce if isinstance(nonce, str) and nonce else None


def mount_frontend_dist(
    app: FastAPI,
    dist_dir: Path,
    seo_provider: FrontendSeoProvider | None = None,
) -> FastAPI:
    index_file = dist_dir / "index.html"
    if not index_file.is_file():
        raise FileNotFoundError(f"Missing frontend build: {index_file}")

    assets_dir = dist_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{frontend_path:path}", include_in_schema=False, response_model=None)
    def serve_frontend(frontend_path: str, request: Request) -> Response:
        request_path = f"/{frontend_path}"
        if request_path.startswith(RESERVED_FRONTEND_PATHS):
            raise HTTPException(status_code=404, detail="Not found")

        static_file = frontend_static_file(dist_dir, frontend_path)
        if static_file is not None:
            if static_file == index_file.resolve():
                if seo_provider is None:
                    return FileResponse(index_file, headers=FRONTEND_HTML_HEADERS)
                metadata = seo_provider(request_path, request)
                index_html = index_file.read_text(encoding="utf-8")
                return HTMLResponse(
                    inject_frontend_seo(index_html, metadata, request_csp_nonce(request)),
                    headers=FRONTEND_HTML_HEADERS,
                )
            return FileResponse(static_file)

        if seo_provider is None:
            return FileResponse(index_file, headers=FRONTEND_HTML_HEADERS)

        metadata = seo_provider(request_path, request)
        index_html = index_file.read_text(encoding="utf-8")
        return HTMLResponse(
            inject_frontend_seo(index_html, metadata, request_csp_nonce(request)),
            headers=FRONTEND_HTML_HEADERS,
        )

    return app
