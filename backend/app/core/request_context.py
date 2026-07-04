import logging
import re
from collections.abc import Awaitable, Callable
from http import HTTPStatus
from uuid import uuid4

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"
REQUEST_ID_MAX_LENGTH = 96
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]+$")

logger = logging.getLogger(__name__)


def request_id_from_request(request: Request) -> str:
    raw_request_id = request.headers.get(REQUEST_ID_HEADER, "").strip()
    if raw_request_id and len(raw_request_id) <= REQUEST_ID_MAX_LENGTH and REQUEST_ID_PATTERN.fullmatch(raw_request_id):
        return raw_request_id
    return uuid4().hex


def request_id_from_state(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None)
    if isinstance(request_id, str) and request_id:
        return request_id
    return request_id_from_request(request)


async def request_context_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    request_id = request_id_from_request(request)
    request.state.request_id = request_id

    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled API error", extra={"request_id": request_id})
        response = JSONResponse(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error", "request_id": request_id},
        )

    response.headers[REQUEST_ID_HEADER] = request_id
    return response


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = request_id_from_state(request)
    headers = dict(exc.headers or {})
    headers[REQUEST_ID_HEADER] = request_id
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request_id},
        headers=headers,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = request_id_from_state(request)
    return JSONResponse(
        status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
        content={"detail": jsonable_encoder(exc.errors()), "request_id": request_id},
        headers={REQUEST_ID_HEADER: request_id},
    )
