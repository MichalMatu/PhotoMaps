import math
import os
import time
from collections import deque
from dataclasses import dataclass
from ipaddress import IPv4Address, IPv6Address, ip_address, ip_network
from threading import Lock

from fastapi import HTTPException, Request

DEFAULT_TRUSTED_PROXY_NETWORKS = "127.0.0.1/32,::1/128"
MAX_TRACKED_RATE_LIMIT_BUCKETS = 10_000


def positive_int_from_env(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a positive integer") from exc
    if value <= 0:
        raise RuntimeError(f"{name} must be a positive integer")
    return value


@dataclass(frozen=True)
class RateLimitPolicy:
    scope: str
    requests: int
    window_seconds: int


@dataclass
class RateLimitBucket:
    timestamps: deque[float]
    window_seconds: int


PUBLIC_MEMORY_UPLOAD_RATE_LIMIT_POLICY = RateLimitPolicy(
    scope="public-memory-upload",
    requests=positive_int_from_env("PHOTOMAP_PUBLIC_MEMORY_UPLOAD_RATE_LIMIT", 10),
    window_seconds=positive_int_from_env("PHOTOMAP_PUBLIC_MEMORY_UPLOAD_RATE_WINDOW_SECONDS", 3600),
)
PUBLIC_REPORT_RATE_LIMIT_POLICY = RateLimitPolicy(
    scope="public-report-create",
    requests=positive_int_from_env("PHOTOMAP_PUBLIC_REPORT_RATE_LIMIT", 20),
    window_seconds=positive_int_from_env("PHOTOMAP_PUBLIC_REPORT_RATE_WINDOW_SECONDS", 3600),
)
PUBLIC_MEMORY_OWNER_RATE_LIMIT_POLICY = RateLimitPolicy(
    scope="public-memory-owner-mutation",
    requests=positive_int_from_env("PHOTOMAP_PUBLIC_MEMORY_OWNER_RATE_LIMIT", 30),
    window_seconds=positive_int_from_env("PHOTOMAP_PUBLIC_MEMORY_OWNER_RATE_WINDOW_SECONDS", 3600),
)


def trusted_proxy_networks():
    configured_networks = os.getenv("PHOTOMAP_TRUSTED_PROXY_NETWORKS", DEFAULT_TRUSTED_PROXY_NETWORKS)
    try:
        return tuple(
            ip_network(value.strip(), strict=False) for value in configured_networks.split(",") if value.strip()
        )
    except ValueError as exc:
        raise RuntimeError("PHOTOMAP_TRUSTED_PROXY_NETWORKS contains an invalid network") from exc


def parsed_ip(value: str | None) -> IPv4Address | IPv6Address | None:
    if not value:
        return None
    try:
        return ip_address(value.strip())
    except ValueError:
        return None


def request_client_key(request: Request) -> str:
    peer_host = request.client.host if request.client is not None else None
    peer_ip = parsed_ip(peer_host)
    is_trusted_proxy = peer_ip is not None and any(peer_ip in network for network in trusted_proxy_networks())
    if is_trusted_proxy:
        cloudflare_ip = parsed_ip(request.headers.get("cf-connecting-ip"))
        if cloudflare_ip is not None:
            return cloudflare_ip.compressed
    if peer_ip is not None:
        return peer_ip.compressed
    return peer_host or "unknown-client"


class InMemoryRateLimiter:
    def __init__(self, max_buckets: int = MAX_TRACKED_RATE_LIMIT_BUCKETS) -> None:
        self._buckets: dict[tuple[str, str], RateLimitBucket] = {}
        self._lock = Lock()
        self._max_buckets = max_buckets

    def clear(self) -> None:
        with self._lock:
            self._buckets.clear()

    def retry_after(
        self,
        policy: RateLimitPolicy,
        client_key: str,
        *,
        now: float | None = None,
    ) -> int | None:
        current_time = time.monotonic() if now is None else now
        bucket_key = (policy.scope, client_key)

        with self._lock:
            bucket = self._buckets.get(bucket_key)
            if bucket is None:
                self._remove_expired_buckets(current_time)
                if len(self._buckets) >= self._max_buckets:
                    return policy.window_seconds
                bucket = RateLimitBucket(timestamps=deque(), window_seconds=policy.window_seconds)
                self._buckets[bucket_key] = bucket

            bucket.window_seconds = policy.window_seconds
            cutoff = current_time - policy.window_seconds
            while bucket.timestamps and bucket.timestamps[0] <= cutoff:
                bucket.timestamps.popleft()
            if len(bucket.timestamps) >= policy.requests:
                return max(1, math.ceil(bucket.timestamps[0] + policy.window_seconds - current_time))
            bucket.timestamps.append(current_time)
            return None

    def _remove_expired_buckets(self, current_time: float) -> None:
        expired_keys = [
            key
            for key, bucket in self._buckets.items()
            if not bucket.timestamps or bucket.timestamps[-1] + bucket.window_seconds <= current_time
        ]
        for key in expired_keys:
            del self._buckets[key]


public_rate_limiter = InMemoryRateLimiter()


def enforce_public_rate_limit(request: Request, policy: RateLimitPolicy) -> None:
    retry_after = public_rate_limiter.retry_after(policy, request_client_key(request))
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={"Retry-After": str(retry_after)},
        )
