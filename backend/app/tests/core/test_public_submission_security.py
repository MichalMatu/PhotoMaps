from app.core import public_submission_security
from app.core.public_submission_security import InFlightRequestLimiter
from app.tests.support import ADMIN_HEADERS


def test_in_flight_request_limiter_is_non_blocking_and_bounded() -> None:
    limiter = InFlightRequestLimiter(1)

    assert limiter.try_acquire() is True
    assert limiter.try_acquire() is False
    limiter.release()
    assert limiter.try_acquire() is True
    limiter.release()


def test_public_report_rejects_oversized_body_before_validation(client_session, monkeypatch) -> None:
    client, _session = client_session
    monkeypatch.setattr(public_submission_security, "PUBLIC_REPORT_MAX_REQUEST_BYTES", 8)

    response = client.post(
        "/api/reports",
        content=b'{"message":"too large"}',
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Request body is too large"


def test_public_memory_upload_rejects_oversized_content_length_before_parsing(client_session, monkeypatch) -> None:
    client, _session = client_session
    monkeypatch.setattr(public_submission_security, "PUBLIC_MEMORY_UPLOAD_MAX_REQUEST_BYTES", 8)

    response = client.post(
        "/api/places/missing/memories",
        content=b"larger than eight bytes",
        headers={"content-type": "multipart/form-data; boundary=test"},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Request body is too large"


def test_public_memory_upload_stops_chunked_body_before_multipart_parsing(client_session, monkeypatch) -> None:
    client, _session = client_session
    monkeypatch.setattr(public_submission_security, "PUBLIC_MEMORY_UPLOAD_MAX_REQUEST_BYTES", 8)

    def request_body():
        yield b"12345"
        yield b"67890"

    response = client.post(
        "/api/places/missing/memories",
        content=request_body(),
        headers={
            "content-type": "multipart/form-data; boundary=test",
            "transfer-encoding": "chunked",
        },
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Request body is too large"
    assert response.headers["x-request-id"] == response.json()["request_id"]


def test_public_memory_upload_rejects_parallel_processing_before_parsing(client_session, monkeypatch) -> None:
    client, _session = client_session
    limiter = InFlightRequestLimiter(1)
    monkeypatch.setattr(public_submission_security, "public_memory_upload_in_flight_limiter", limiter)
    assert limiter.try_acquire() is True
    try:
        response = client.post(
            "/api/places/missing/memories",
            content=b"not parsed",
            headers={"content-type": "multipart/form-data; boundary=test"},
        )
    finally:
        limiter.release()

    assert response.status_code == 429
    assert response.json()["detail"] == "Too many uploads in progress"
    assert response.headers["retry-after"] == "10"


def test_admin_mutation_rejects_invalid_token_before_reading_large_body(client_session, monkeypatch) -> None:
    client, _session = client_session
    monkeypatch.setattr(public_submission_security, "ADMIN_DEFAULT_MAX_REQUEST_BYTES", 8)

    response = client.post(
        "/api/admin/categories",
        content=b"body larger than the configured limit",
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid admin token"
    assert response.headers["www-authenticate"] == "Bearer"


def test_authenticated_admin_mutation_enforces_streaming_body_limit(client_session, monkeypatch) -> None:
    client, _session = client_session
    monkeypatch.setattr(public_submission_security, "ADMIN_DEFAULT_MAX_REQUEST_BYTES", 8)

    def request_body():
        yield b"12345"
        yield b"67890"

    response = client.post(
        "/api/admin/categories",
        content=request_body(),
        headers={
            **ADMIN_HEADERS,
            "content-type": "application/json",
            "transfer-encoding": "chunked",
        },
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Request body is too large"
