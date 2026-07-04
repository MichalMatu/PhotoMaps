from fastapi import Request

from app.main import app
from app.tests.support import ADMIN_HEADERS, BAD_ADMIN_HEADERS


def test_success_response_preserves_valid_request_id(client_session) -> None:
    client, _session = client_session

    response = client.get("/health", headers={"X-Request-ID": "ui-req-123"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "ui-req-123"
    assert response.json() == {"status": "ok"}


def test_http_error_contract_includes_request_id_and_existing_detail(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/categories", headers={**BAD_ADMIN_HEADERS, "X-Request-ID": "admin-req-1"})

    assert response.status_code == 401
    assert response.headers["x-request-id"] == "admin-req-1"
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json() == {"detail": "Invalid admin token", "request_id": "admin-req-1"}


def test_not_found_error_contract_includes_request_id(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/places/missing-place", headers={"X-Request-ID": "missing-req-1"})

    assert response.status_code == 404
    assert response.headers["x-request-id"] == "missing-req-1"
    assert response.json() == {"detail": "Place not found", "request_id": "missing-req-1"}


def test_validation_error_contract_includes_request_id(client_session) -> None:
    client, _session = client_session

    response = client.get(
        "/api/admin/reports?status=unsupported",
        headers={**ADMIN_HEADERS, "X-Request-ID": "validation-req-1"},
    )

    assert response.status_code == 422
    body = response.json()
    assert response.headers["x-request-id"] == "validation-req-1"
    assert body["request_id"] == "validation-req-1"
    assert isinstance(body["detail"], list)


def test_unhandled_error_contract_hides_exception_detail(client_session) -> None:
    client, _session = client_session

    async def raise_runtime_error(_request: Request) -> None:
        raise RuntimeError("private storage secret")

    existing_routes = list(app.router.routes)
    app.router.add_api_route("/__test/error-contract", raise_runtime_error, methods=["GET"])
    try:
        response = client.get("/__test/error-contract", headers={"X-Request-ID": "server-req-1"})
    finally:
        app.router.routes[:] = existing_routes

    assert response.status_code == 500
    assert response.headers["x-request-id"] == "server-req-1"
    assert response.json() == {"detail": "Internal server error", "request_id": "server-req-1"}
