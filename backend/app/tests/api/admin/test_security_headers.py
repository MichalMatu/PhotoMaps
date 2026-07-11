from app.core.security_headers import SECURITY_HEADERS


def test_security_headers_are_added_to_public_responses(client_session) -> None:
    client, _session = client_session

    response = client.get("/health")

    assert response.status_code == 200
    for header, value in SECURITY_HEADERS.items():
        assert response.headers[header] == value
    assert "script-src 'self' 'nonce-" in response.headers["content-security-policy"]
    assert "strict-transport-security" not in response.headers


def test_https_responses_enable_hsts(client_session) -> None:
    client, _session = client_session

    response = client.get("/health", headers={"host": "photomap.pl"}, follow_redirects=False)
    https_response = client.get(
        "https://photomap.pl/health",
        headers={"host": "photomap.pl"},
        follow_redirects=False,
    )

    assert response.status_code == 200
    assert https_response.headers["strict-transport-security"] == "max-age=63072000; includeSubDomains; preload"


def test_admin_responses_are_not_cacheable(client_session) -> None:
    client, _session = client_session

    response = client.get("/api/admin/categories")

    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["pragma"] == "no-cache"


def test_untrusted_host_is_rejected(client_session) -> None:
    client, _session = client_session

    response = client.get("/health", headers={"host": "attacker.example"})

    assert response.status_code == 400
    assert response.headers["x-frame-options"] == "DENY"


def test_public_media_is_not_stored_by_the_cdn(client_session) -> None:
    client, _session = client_session

    response = client.get("/media/missing.jpg")

    assert response.status_code == 404
    assert response.headers["cache-control"] == "public, max-age=0, must-revalidate"
    assert response.headers["cdn-cache-control"] == "no-store"
    assert response.headers["cloudflare-cdn-cache-control"] == "no-store"


def test_development_docs_allow_only_their_pinned_cdn_scripts(client_session) -> None:
    client, _session = client_session

    response = client.get("/docs")

    assert response.status_code == 200
    policy = response.headers["content-security-policy"]
    assert "script-src 'self' 'nonce-" in policy
    assert "'unsafe-inline' https://cdn.jsdelivr.net" in policy
