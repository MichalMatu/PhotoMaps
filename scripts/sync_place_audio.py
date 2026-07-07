#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import asdict, dataclass, replace
from pathlib import Path
from typing import Any

AUDIO_EXTENSIONS = (".mp3", ".m4a", ".flac")
DEFAULT_BASE_URL = "https://photomap.pl"
DEFAULT_CITY_ID = "wroclaw"
DEFAULT_AUDIO_DIR = Path("research-exports/place-audio")


@dataclass(frozen=True)
class MediaTarget:
    kind: str
    id: str
    has_audio: bool
    public_path: str | None


@dataclass(frozen=True)
class PlaceAudioJob:
    city_id: str
    slug: str
    title: str
    status: str
    target_kind: str | None
    target_id: str | None
    audio_path: str | None
    upload_path: str | None
    message: str


def normalize_base_url(base_url: str) -> str:
    normalized = base_url.strip().rstrip("/")
    if not normalized.startswith(("http://", "https://")):
        raise ValueError("base URL must start with http:// or https://")
    return normalized


def public_map_path(city_id: str | None) -> str:
    if city_id:
        query = urllib.parse.urlencode({"city_id": city_id})
        return f"/api/places/map?{query}"
    return "/api/places/map"


def admin_audio_upload_path(kind: str, media_id: str) -> str:
    if kind == "photo":
        return f"/api/admin/photos/{urllib.parse.quote(media_id, safe='')}/audio"
    if kind == "memory":
        return f"/api/admin/memories/{urllib.parse.quote(media_id, safe='')}/audio"
    raise ValueError(f"unsupported media target kind: {kind}")


def index_audio_files(audio_dir: Path) -> tuple[dict[str, Path], dict[str, list[Path]]]:
    if not audio_dir.exists():
        return {}, {}
    if not audio_dir.is_dir():
        raise ValueError(f"audio-dir is not a directory: {audio_dir}")

    files_by_slug: dict[str, Path] = {}
    duplicates: dict[str, list[Path]] = {}
    for path in sorted(audio_dir.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in AUDIO_EXTENSIONS:
            continue
        slug = path.stem
        existing = files_by_slug.get(slug)
        if existing is None:
            files_by_slug[slug] = path
            continue
        duplicates.setdefault(slug, [existing]).append(path)

    return files_by_slug, duplicates


def place_has_audio(place: dict[str, Any]) -> bool:
    cover_photo = place.get("cover_photo")
    if isinstance(cover_photo, dict) and cover_photo.get("audio") is not None:
        return True

    preview_items = place.get("preview_items")
    if isinstance(preview_items, list):
        return any(isinstance(item, dict) and item.get("audio") is not None for item in preview_items)

    return False


def media_target_from_item(item: dict[str, Any], kind: str | None = None) -> MediaTarget | None:
    media_id = item.get("id")
    target_kind = kind or item.get("kind")
    if not isinstance(media_id, str) or target_kind not in {"photo", "memory"}:
        return None
    public_path = item.get("public_path") if isinstance(item.get("public_path"), str) else None
    return MediaTarget(
        kind=target_kind,
        id=media_id,
        has_audio=item.get("audio") is not None,
        public_path=public_path,
    )


def select_upload_target(place: dict[str, Any]) -> MediaTarget | None:
    cover_photo = place.get("cover_photo")
    if isinstance(cover_photo, dict):
        cover_target = media_target_from_item(cover_photo, "photo")
        if cover_target is not None:
            return cover_target

    preview_items = place.get("preview_items")
    if not isinstance(preview_items, list):
        return None

    for item in preview_items:
        if isinstance(item, dict) and item.get("kind") == "photo":
            photo_target = media_target_from_item(item)
            if photo_target is not None:
                return photo_target

    for item in preview_items:
        if isinstance(item, dict):
            target = media_target_from_item(item)
            if target is not None:
                return target

    return None


def build_audio_jobs(
    places: list[dict[str, Any]],
    audio_files_by_slug: dict[str, Path],
    duplicate_audio_files_by_slug: dict[str, list[Path]] | None = None,
    *,
    force: bool = False,
) -> list[PlaceAudioJob]:
    duplicate_audio_files_by_slug = duplicate_audio_files_by_slug or {}
    jobs: list[PlaceAudioJob] = []

    for place in places:
        slug = place.get("slug")
        title = place.get("title")
        city_id = place.get("city_id")
        if not isinstance(slug, str) or not isinstance(title, str) or not isinstance(city_id, str):
            continue

        if slug in duplicate_audio_files_by_slug:
            paths = ", ".join(str(path) for path in duplicate_audio_files_by_slug[slug])
            jobs.append(
                PlaceAudioJob(
                    city_id=city_id,
                    slug=slug,
                    title=title,
                    status="duplicate_audio_file",
                    target_kind=None,
                    target_id=None,
                    audio_path=None,
                    upload_path=None,
                    message=f"więcej niż jeden plik pasuje do sluga: {paths}",
                )
            )
            continue

        if place_has_audio(place) and not force:
            jobs.append(
                PlaceAudioJob(
                    city_id=city_id,
                    slug=slug,
                    title=title,
                    status="already_has_audio",
                    target_kind=None,
                    target_id=None,
                    audio_path=None,
                    upload_path=None,
                    message="miejsce ma już publiczne audio w coverze albo podglądzie mapy",
                )
            )
            continue

        target = select_upload_target(place)
        if target is None:
            jobs.append(
                PlaceAudioJob(
                    city_id=city_id,
                    slug=slug,
                    title=title,
                    status="no_media_target",
                    target_kind=None,
                    target_id=None,
                    audio_path=None,
                    upload_path=None,
                    message="brak covera, zdjęcia albo pamiątki, do których można przypiąć audio",
                )
            )
            continue

        audio_path = audio_files_by_slug.get(slug)
        if audio_path is None:
            jobs.append(
                PlaceAudioJob(
                    city_id=city_id,
                    slug=slug,
                    title=title,
                    status="missing_audio_file",
                    target_kind=target.kind,
                    target_id=target.id,
                    audio_path=None,
                    upload_path=admin_audio_upload_path(target.kind, target.id),
                    message=f"brak pliku {slug}.mp3/.m4a/.flac w katalogu audio",
                )
            )
            continue

        jobs.append(
            PlaceAudioJob(
                city_id=city_id,
                slug=slug,
                title=title,
                status="ready",
                target_kind=target.kind,
                target_id=target.id,
                audio_path=str(audio_path),
                upload_path=admin_audio_upload_path(target.kind, target.id),
                message="gotowe do wgrania",
            )
        )

    return jobs


def fetch_json(base_url: str, path: str, *, timeout: float) -> Any:
    url = f"{base_url}{path}"
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"GET {url} failed: HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"GET {url} failed: {exc.reason}") from exc


def multipart_audio_body(field_name: str, audio_path: Path) -> tuple[bytes, str]:
    mimetypes.add_type("audio/mpeg", ".mp3")
    mimetypes.add_type("audio/mp4", ".m4a")
    mimetypes.add_type("audio/flac", ".flac")

    boundary = f"photomap-audio-{uuid.uuid4().hex}"
    content_type = mimetypes.guess_type(str(audio_path))[0] or "application/octet-stream"
    file_name = audio_path.name
    file_bytes = audio_path.read_bytes()

    parts = [
        f"--{boundary}\r\n".encode("utf-8"),
        (
            f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8"),
        file_bytes,
        b"\r\n",
        f"--{boundary}--\r\n".encode("utf-8"),
    ]
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def upload_audio_job(base_url: str, admin_token: str, job: PlaceAudioJob, *, timeout: float) -> PlaceAudioJob:
    if job.status != "ready" or job.upload_path is None or job.audio_path is None:
        return job

    audio_path = Path(job.audio_path)
    if not audio_path.is_file():
        return replace(job, status="upload_error", message=f"plik audio nie istnieje: {audio_path}")

    body, content_type = multipart_audio_body("audio_file", audio_path)
    url = f"{base_url}{job.upload_path}"
    request = urllib.request.Request(
        url,
        data=body,
        method="PUT",
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": content_type,
            "Content-Length": str(len(body)),
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        return replace(job, status="upload_error", message=f"HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        return replace(job, status="upload_error", message=str(exc.reason))

    return replace(job, status="uploaded", message="audio wgrane")


def summarize_jobs(jobs: list[PlaceAudioJob]) -> dict[str, int]:
    summary: dict[str, int] = {}
    for job in jobs:
        summary[job.status] = summary.get(job.status, 0) + 1
    return dict(sorted(summary.items()))


def jobs_payload(base_url: str, city_id: str | None, audio_dir: Path, jobs: list[PlaceAudioJob]) -> dict[str, Any]:
    return {
        "base_url": base_url,
        "city_id": city_id,
        "audio_dir": str(audio_dir),
        "summary": summarize_jobs(jobs),
        "jobs": [asdict(job) for job in jobs],
    }


def print_human_jobs(base_url: str, city_id: str | None, audio_dir: Path, jobs: list[PlaceAudioJob]) -> None:
    city_label = city_id or "wszystkie aktywne miasta"
    print(f"PhotoMap audio sync: {base_url} / {city_label}")
    print(f"Katalog audio: {audio_dir}")
    print("Podsumowanie:")
    for status, count in summarize_jobs(jobs).items():
        print(f"  {status}: {count}")
    print("")

    for job in jobs:
        target = f"{job.target_kind}:{job.target_id}" if job.target_kind and job.target_id else "-"
        audio_path = job.audio_path or "-"
        print(f"{job.status:22} {job.slug:34} {target:42} {audio_path}")
        print(f"  {job.message}")


def write_payload(path: Path, payload: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Audytuje i synchronizuje audio miejsc PhotoMap. Skrypt używa publicznego /api/places/map "
            "do znalezienia miejsc i adminowych endpointów audio do wgrania plików."
        )
    )
    parser.add_argument("--base-url", default=os.environ.get("PHOTOMAP_BASE_URL", DEFAULT_BASE_URL))
    parser.add_argument("--city", default=os.environ.get("PHOTOMAP_CITY", DEFAULT_CITY_ID))
    parser.add_argument(
        "--all-cities",
        action="store_true",
        help="pobierz /api/places/map bez filtra city_id",
    )
    parser.add_argument(
        "--audio-dir",
        type=Path,
        default=Path(os.environ.get("PHOTOMAP_AUDIO_DIR", str(DEFAULT_AUDIO_DIR))),
        help="katalog z plikami nazwanymi slugami miejsc, np. ostrow-tumski.mp3",
    )
    parser.add_argument("--force", action="store_true", help="wgraj/replace także dla miejsc, które już mają audio")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="wykonaj upload do admin API")
    mode.add_argument("--dry-run", action="store_true", help="tylko pokaż plan; domyślne zachowanie")
    parser.add_argument(
        "--admin-token-env",
        default="PHOTOMAP_ADMIN_TOKEN",
        help="nazwa zmiennej środowiskowej z tokenem admina dla --apply",
    )
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--json", action="store_true", help="wypisz wynik jako JSON")
    parser.add_argument("--output", type=Path, help="zapisz wynik JSON do pliku")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        base_url = normalize_base_url(args.base_url)
        audio_files_by_slug, duplicate_audio_files_by_slug = index_audio_files(args.audio_dir)
    except ValueError as exc:
        print(f"Błąd: {exc}", file=sys.stderr)
        return 2

    city_id = None if args.all_cities else args.city
    if city_id is not None:
        city_id = city_id.strip() or None

    if args.apply:
        admin_token = os.environ.get(args.admin_token_env, "").strip()
        if not admin_token:
            print(f"Błąd: ustaw {args.admin_token_env}=... dla --apply", file=sys.stderr)
            return 2
    else:
        admin_token = ""

    try:
        places = fetch_json(base_url, public_map_path(city_id), timeout=args.timeout)
    except RuntimeError as exc:
        print(f"Błąd: {exc}", file=sys.stderr)
        return 1

    if not isinstance(places, list):
        print("Błąd: /api/places/map nie zwrócił listy miejsc", file=sys.stderr)
        return 1

    jobs = build_audio_jobs(
        places,
        audio_files_by_slug,
        duplicate_audio_files_by_slug,
        force=args.force,
    )

    if args.apply:
        jobs = [upload_audio_job(base_url, admin_token, job, timeout=args.timeout) for job in jobs]

    payload = jobs_payload(base_url, city_id, args.audio_dir, jobs)
    if args.output:
        output_path = write_payload(args.output, payload)
        if not args.json:
            print(f"Zapisano raport: {output_path}")

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print_human_jobs(base_url, city_id, args.audio_dir, jobs)

    return 1 if any(job.status == "upload_error" for job in jobs) else 0


if __name__ == "__main__":
    raise SystemExit(main())
