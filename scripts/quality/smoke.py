#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen


API_URL = os.getenv("SMOKE_API_URL", "http://127.0.0.1:8000").rstrip("/")
WEB_URL = os.getenv("SMOKE_WEB_URL", "http://127.0.0.1:5174").rstrip("/")
TIMEOUT_SECONDS = float(os.getenv("SMOKE_TIMEOUT_SECONDS", "5"))


def fail(message: str) -> None:
    print(f"smoke failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_url(url: str, *, accept: str = "application/json") -> tuple[int, str, str]:
    request = Request(url, headers={"Accept": accept})
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            content_type = response.headers.get("content-type", "")
            body = response.read().decode("utf-8", errors="replace")
            return response.status, content_type, body
    except URLError as exc:
        fail(f"{url} did not respond: {exc}")


def read_json(url: str) -> Any:
    status, content_type, body = read_url(url)
    if status != 200:
        fail(f"{url} returned HTTP {status}")
    if "application/json" not in content_type:
        fail(f"{url} returned non-json content type {content_type!r}")
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        fail(f"{url} returned invalid JSON: {exc}")


def assert_no_private_original_path(payload: Any) -> None:
    if isinstance(payload, dict):
        if "original_path" in payload:
            fail("public API leaked original_path")
        for value in payload.values():
            assert_no_private_original_path(value)
    elif isinstance(payload, list):
        for item in payload:
            assert_no_private_original_path(item)


def main() -> None:
    health = read_json(f"{API_URL}/health")
    if health != {"status": "ok"}:
        fail(f"unexpected health response: {health!r}")

    categories = read_json(f"{API_URL}/api/categories")
    if not isinstance(categories, list):
        fail("/api/categories did not return a list")

    map_places = read_json(f"{API_URL}/api/places/map")
    if not isinstance(map_places, list):
        fail("/api/places/map did not return a list")
    assert_no_private_original_path(map_places)

    guides = read_json(f"{API_URL}/api/guides")
    if not isinstance(guides, list):
        fail("/api/guides did not return a list")

    status, content_type, body = read_url(f"{WEB_URL}/", accept="text/html")
    if status != 200:
        fail(f"frontend returned HTTP {status}")
    if "text/html" not in content_type:
        fail(f"frontend returned non-html content type {content_type!r}")
    if '<div id="root">' not in body:
        fail("frontend HTML does not contain root mount node")

    print("smoke ok")


if __name__ == "__main__":
    main()
