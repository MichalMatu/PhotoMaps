from app.tests.support import ADMIN_HEADERS, BAD_ADMIN_HEADERS


def test_admin_rejects_bad_token_with_consistent_401(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/categories", headers=BAD_ADMIN_HEADERS)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid admin token"
    assert response.headers["www-authenticate"] == "Bearer"


def test_admin_without_configured_token_returns_consistent_503(client_session, monkeypatch) -> None:
    client, _session = client_session
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)

    response = client.get("/api/admin/categories", headers=ADMIN_HEADERS)

    assert response.status_code == 503
    assert response.json()["detail"] == "Admin token is not configured"
