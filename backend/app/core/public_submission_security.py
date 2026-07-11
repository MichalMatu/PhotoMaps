from collections.abc import Awaitable, Callable
from threading import Lock

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.admin_auth import validate_admin_token
from app.core.rate_limit import (
    PUBLIC_MEMORY_OWNER_RATE_LIMIT_POLICY,
    PUBLIC_MEMORY_UPLOAD_RATE_LIMIT_POLICY,
    PUBLIC_REPORT_RATE_LIMIT_POLICY,
    RateLimitPolicy,
    enforce_public_rate_limit,
    positive_int_from_env,
)
from app.core.request_context import REQUEST_ID_HEADER, request_id_from_request
from app.services.media.audio import MAX_AUDIO_BYTES
from app.services.media.images import MAX_IMAGE_BYTES

MULTIPART_OVERHEAD_BYTES = 2 * 1024 * 1024
PUBLIC_MEMORY_UPLOAD_MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + MAX_AUDIO_BYTES + MULTIPART_OVERHEAD_BYTES
PUBLIC_REPORT_MAX_REQUEST_BYTES = 16 * 1024
PUBLIC_MEMORY_MUTATION_MAX_REQUEST_BYTES = 64 * 1024
ADMIN_DEFAULT_MAX_REQUEST_BYTES = 1024 * 1024
ADMIN_PHOTO_UPLOAD_MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + MAX_AUDIO_BYTES + MULTIPART_OVERHEAD_BYTES
ADMIN_AUDIO_UPLOAD_MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + MULTIPART_OVERHEAD_BYTES
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


class InFlightRequestLimiter:
    def __init__(self, maximum: int) -> None:
        if maximum <= 0:
            raise ValueError("maximum must be positive")
        self._maximum = maximum
        self._active = 0
        self._lock = Lock()

    def try_acquire(self) -> bool:
        with self._lock:
            if self._active >= self._maximum:
                return False
            self._active += 1
            return True

    def release(self) -> None:
        with self._lock:
            if self._active <= 0:
                raise RuntimeError("in-flight request limiter released without acquisition")
            self._active -= 1


public_memory_upload_in_flight_limiter = InFlightRequestLimiter(
    positive_int_from_env("PHOTOMAP_PUBLIC_MEMORY_UPLOAD_MAX_CONCURRENCY", 1)
)
admin_media_upload_in_flight_limiter = InFlightRequestLimiter(
    positive_int_from_env("PHOTOMAP_ADMIN_MEDIA_UPLOAD_MAX_CONCURRENCY", 1)
)


def submission_error_response(request: Request, status_code: int, detail: str, headers: dict[str, str] | None = None):
    request_id = request_id_from_request(request)
    response_headers = dict(headers or {})
    response_headers[REQUEST_ID_HEADER] = request_id
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail, "request_id": request_id},
        headers=response_headers,
    )


def is_admin_photo_upload(method: str, path_parts: list[str]) -> bool:
    return (
        method == "POST"
        and len(path_parts) == 5
        and path_parts[:3] == ["api", "admin", "places"]
        and path_parts[4] == "photos"
    )


def is_admin_audio_upload(method: str, path_parts: list[str]) -> bool:
    return (
        method == "PUT"
        and len(path_parts) == 5
        and path_parts[:2] == ["api", "admin"]
        and path_parts[2] in {"photos", "memories"}
        and path_parts[4] == "audio"
    )


def is_admin_media_upload(method: str, path: str) -> bool:
    path_parts = path.strip("/").split("/")
    return is_admin_photo_upload(method, path_parts) or is_admin_audio_upload(method, path_parts)


def submission_limits(method: str, path: str) -> tuple[int, RateLimitPolicy | None] | None:
    path_parts = path.strip("/").split("/")
    if method in UNSAFE_METHODS and path.startswith("/api/admin/"):
        if is_admin_photo_upload(method, path_parts):
            return ADMIN_PHOTO_UPLOAD_MAX_REQUEST_BYTES, None
        if is_admin_audio_upload(method, path_parts):
            return ADMIN_AUDIO_UPLOAD_MAX_REQUEST_BYTES, None
        return ADMIN_DEFAULT_MAX_REQUEST_BYTES, None

    if method == "POST" and path == "/api/reports":
        return PUBLIC_REPORT_MAX_REQUEST_BYTES, PUBLIC_REPORT_RATE_LIMIT_POLICY

    if len(path_parts) == 4 and path_parts[:2] == ["api", "places"] and path_parts[3] == "memories":
        if method == "POST":
            return PUBLIC_MEMORY_UPLOAD_MAX_REQUEST_BYTES, PUBLIC_MEMORY_UPLOAD_RATE_LIMIT_POLICY
        return None
    if (
        method in UNSAFE_METHODS
        and len(path_parts) >= 5
        and path_parts[:2] == ["api", "places"]
        and path_parts[3] == "memories"
    ):
        return PUBLIC_MEMORY_MUTATION_MAX_REQUEST_BYTES, PUBLIC_MEMORY_OWNER_RATE_LIMIT_POLICY
    return None


def is_public_memory_upload(method: str, path: str) -> bool:
    path_parts = path.strip("/").split("/")
    return (
        method == "POST"
        and len(path_parts) == 4
        and path_parts[:2] == ["api", "places"]
        and path_parts[3] == "memories"
    )


class RequestBodyLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        limits = submission_limits(scope["method"], scope["path"])
        if limits is None:
            await self.app(scope, receive, send)
            return

        max_request_bytes, _rate_limit_policy = limits
        received_bytes = 0

        async def limited_receive() -> Message:
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > max_request_bytes:
                    raise StarletteHTTPException(status_code=413, detail="Request body is too large")
            return message

        await self.app(scope, limited_receive, send)


async def submission_security_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    limits = submission_limits(request.method, request.url.path)
    if limits is None:
        return await call_next(request)

    max_request_bytes, rate_limit_policy = limits
    if request.method in UNSAFE_METHODS and request.url.path.startswith("/api/admin/"):
        try:
            validate_admin_token(request.headers.get("authorization"))
        except HTTPException as exc:
            return submission_error_response(
                request,
                exc.status_code,
                str(exc.detail),
                dict(exc.headers or {}),
            )

    if rate_limit_policy is not None:
        try:
            enforce_public_rate_limit(request, rate_limit_policy)
        except HTTPException as exc:
            return submission_error_response(
                request,
                exc.status_code,
                str(exc.detail),
                dict(exc.headers or {}),
            )

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            request_bytes = int(content_length)
        except ValueError:
            return submission_error_response(request, 400, "Invalid Content-Length")
        if request_bytes < 0:
            return submission_error_response(request, 400, "Invalid Content-Length")
        if request_bytes > max_request_bytes:
            return submission_error_response(request, 413, "Request body is too large")

    concurrency_limiter = None
    if is_public_memory_upload(request.method, request.url.path):
        concurrency_limiter = public_memory_upload_in_flight_limiter
    elif is_admin_media_upload(request.method, request.url.path):
        concurrency_limiter = admin_media_upload_in_flight_limiter
    if concurrency_limiter is not None and not concurrency_limiter.try_acquire():
        return submission_error_response(
            request,
            429,
            "Too many uploads in progress",
            {"Retry-After": "10"},
        )

    try:
        return await call_next(request)
    finally:
        if concurrency_limiter is not None:
            concurrency_limiter.release()
