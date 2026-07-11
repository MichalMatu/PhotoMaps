from starlette.requests import Request

from app.core.rate_limit import InMemoryRateLimiter, RateLimitPolicy, request_client_key


def request_with_client(client_host: str, connecting_ip: str | None = None) -> Request:
    headers = []
    if connecting_ip is not None:
        headers.append((b"cf-connecting-ip", connecting_ip.encode("ascii")))
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/",
            "headers": headers,
            "client": (client_host, 12345),
        }
    )


def test_client_key_uses_cloudflare_ip_only_for_trusted_proxy(monkeypatch) -> None:
    monkeypatch.setenv("PHOTOMAP_TRUSTED_PROXY_NETWORKS", "127.0.0.1/32")

    trusted_request = request_with_client("127.0.0.1", "203.0.113.8")
    untrusted_request = request_with_client("198.51.100.4", "203.0.113.9")

    assert request_client_key(trusted_request) == "203.0.113.8"
    assert request_client_key(untrusted_request) == "198.51.100.4"


def test_client_key_ignores_invalid_forwarded_ip_from_trusted_proxy(monkeypatch) -> None:
    monkeypatch.setenv("PHOTOMAP_TRUSTED_PROXY_NETWORKS", "127.0.0.1/32")

    request = request_with_client("127.0.0.1", "203.0.113.1, 198.51.100.2")

    assert request_client_key(request) == "127.0.0.1"


def test_in_memory_rate_limiter_uses_sliding_window_and_separate_scopes() -> None:
    limiter = InMemoryRateLimiter()
    upload_policy = RateLimitPolicy(scope="upload", requests=2, window_seconds=60)
    report_policy = RateLimitPolicy(scope="report", requests=1, window_seconds=60)

    assert limiter.retry_after(upload_policy, "203.0.113.1", now=100) is None
    assert limiter.retry_after(upload_policy, "203.0.113.1", now=110) is None
    assert limiter.retry_after(upload_policy, "203.0.113.1", now=120) == 40
    assert limiter.retry_after(report_policy, "203.0.113.1", now=120) is None
    assert limiter.retry_after(upload_policy, "203.0.113.1", now=161) is None


def test_in_memory_rate_limiter_fails_closed_at_bucket_capacity() -> None:
    limiter = InMemoryRateLimiter(max_buckets=1)
    policy = RateLimitPolicy(scope="public", requests=2, window_seconds=60)

    assert limiter.retry_after(policy, "203.0.113.1", now=100) is None
    assert limiter.retry_after(policy, "203.0.113.2", now=101) == 60
    assert limiter.retry_after(policy, "203.0.113.2", now=161) is None
