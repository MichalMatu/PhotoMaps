#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import statistics
import sys
import time
from dataclasses import dataclass
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen


API_URL = os.getenv("PERF_API_URL", "http://127.0.0.1:8000").rstrip("/")
WEB_URL = os.getenv("PERF_WEB_URL", "http://127.0.0.1:5174").rstrip("/")
ITERATIONS = int(os.getenv("PERF_ITERATIONS", "5"))
TIMEOUT_SECONDS = float(os.getenv("PERF_TIMEOUT_SECONDS", "5"))
MAX_MS = float(os.getenv("PERF_MAX_MS", "2500"))
AVG_MS = float(os.getenv("PERF_AVG_MS", "1000"))


@dataclass(frozen=True)
class Probe:
    label: str
    url: str
    accept: str
    response_kind: str


PROBES = [
    Probe("health", f"{API_URL}/health", "application/json", "health"),
    Probe("categories", f"{API_URL}/api/categories", "application/json", "list"),
    Probe("places-map", f"{API_URL}/api/places/map", "application/json", "list"),
    Probe("guides", f"{API_URL}/api/guides", "application/json", "list"),
    Probe("frontend", f"{WEB_URL}/", "text/html", "html"),
]


def fail(message: str) -> None:
    print(f"perf smoke failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_url(probe: Probe) -> tuple[int, str, str, float]:
    request = Request(probe.url, headers={"Accept": probe.accept})
    started = time.perf_counter()
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8", errors="replace")
            elapsed_ms = (time.perf_counter() - started) * 1000
            return response.status, response.headers.get("content-type", ""), body, elapsed_ms
    except URLError as exc:
        fail(f"{probe.label} did not respond: {exc}")


def parse_json(probe: Probe, content_type: str, body: str) -> Any:
    if "application/json" not in content_type:
        fail(f"{probe.label} returned non-json content type {content_type!r}")
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        fail(f"{probe.label} returned invalid JSON: {exc}")


def validate_response(probe: Probe, status: int, content_type: str, body: str) -> None:
    if status != 200:
        fail(f"{probe.label} returned HTTP {status}")

    if probe.response_kind == "html":
        if "text/html" not in content_type:
            fail(f"{probe.label} returned non-html content type {content_type!r}")
        if '<div id="root">' not in body:
            fail("frontend HTML does not contain root mount node")
        return

    payload = parse_json(probe, content_type, body)
    if probe.response_kind == "health" and payload != {"status": "ok"}:
        fail(f"unexpected health response: {payload!r}")
    if probe.response_kind == "list" and not isinstance(payload, list):
        fail(f"{probe.label} did not return a list")


def main() -> None:
    if ITERATIONS < 1:
        fail("PERF_ITERATIONS must be at least 1")

    failed_budget = False
    print(f"perf smoke: {ITERATIONS} iterations, max <= {MAX_MS:.0f} ms, avg <= {AVG_MS:.0f} ms")

    for probe in PROBES:
        samples: list[float] = []
        for _ in range(ITERATIONS):
            status, content_type, body, elapsed_ms = read_url(probe)
            validate_response(probe, status, content_type, body)
            samples.append(elapsed_ms)

        avg_ms = statistics.mean(samples)
        max_ms = max(samples)
        print(f"{probe.label:12} avg={avg_ms:7.1f} ms max={max_ms:7.1f} ms")
        if avg_ms > AVG_MS or max_ms > MAX_MS:
            failed_budget = True

    if failed_budget:
        fail("one or more probes exceeded the latency budget")

    print("perf smoke ok")


if __name__ == "__main__":
    main()
