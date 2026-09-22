from collections.abc import Awaitable, Callable
from secrets import token_urlsafe

from fastapi import Request
from starlette.responses import Response

from app.core.config import IS_PRODUCTION

STYLE_SOURCE_POLICY = (
    "style-src 'self' 'unsafe-inline'" if IS_PRODUCTION else "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net"
)

CSP_NONCE_STATE_ATTRIBUTE = "csp_nonce"


def content_security_policy(nonce: str) -> str:
    script_source_policy = f"script-src 'self' 'nonce-{nonce}'"
    if not IS_PRODUCTION:
        script_source_policy = f"{script_source_policy} 'unsafe-inline' https://cdn.jsdelivr.net"

    return "; ".join(
        (
            "default-src 'self'",
            "base-uri 'self'",
            "connect-src 'self' https:",
            "font-src 'self' data:",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "frame-src 'none'",
            "img-src 'self' data: blob: https:",
            "manifest-src 'self'",
            "media-src 'self' blob: https:",
            "object-src 'none'",
            script_source_policy,
            STYLE_SOURCE_POLICY,
            "worker-src 'self' blob:",
        )
        + (("upgrade-insecure-requests",) if IS_PRODUCTION else ())
    )


SECURITY_HEADERS = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), geolocation=(self), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
}
PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400"
PUBLIC_MEDIA_CDN_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400"
PUBLIC_IMAGE_REVALIDATE_CACHE_CONTROL = "public, max-age=0, must-revalidate"


def is_public_media_path(path: str) -> bool:
    return path.startswith("/media/")


def is_public_media_thumbnail_path(path: str) -> bool:
    return is_public_media_path(path) and "-thumb." in path.rsplit("/", 1)[-1]


def is_public_photo_image_path(path: str) -> bool:
    return path.startswith("/api/places/") and "/photos/" in path and path.endswith("/media/image")


async def security_headers_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    nonce = token_urlsafe(18)
    setattr(request.state, CSP_NONCE_STATE_ATTRIBUTE, nonce)
    response = await call_next(request)
    response.headers.setdefault("Content-Security-Policy", content_security_policy(nonce))
    for header, value in SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)

    if IS_PRODUCTION or request.url.scheme == "https":
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload",
        )

    if request.url.path == "/admin" or request.url.path.startswith("/api/admin/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    elif is_public_media_path(request.url.path):
        response.headers["Cache-Control"] = PUBLIC_MEDIA_CACHE_CONTROL
        if is_public_media_thumbnail_path(request.url.path):
            response.headers["CDN-Cache-Control"] = PUBLIC_MEDIA_CDN_CACHE_CONTROL
            response.headers["Cloudflare-CDN-Cache-Control"] = PUBLIC_MEDIA_CDN_CACHE_CONTROL
        else:
            response.headers["CDN-Cache-Control"] = "no-store"
            response.headers["Cloudflare-CDN-Cache-Control"] = "no-store"
    elif is_public_photo_image_path(request.url.path):
        response.headers["Cache-Control"] = PUBLIC_IMAGE_REVALIDATE_CACHE_CONTROL
        response.headers["CDN-Cache-Control"] = "no-store"
        response.headers["Cloudflare-CDN-Cache-Control"] = "no-store"

    return response
