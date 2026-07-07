import importlib.util
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT_DIR / "scripts" / "sync_place_audio.py"


def load_audio_sync_module():
    spec = importlib.util.spec_from_file_location("sync_place_audio", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def place_payload(slug="rynek-wroclaw", *, cover_audio=None, preview_items=None):
    return {
        "city_id": "wroclaw",
        "slug": slug,
        "title": slug.replace("-", " ").title(),
        "cover_photo": {
            "id": f"photo-{slug}",
            "public_path": f"/media/photos/{slug}.jpg",
            "audio": cover_audio,
        },
        "preview_items": preview_items or [],
    }


def test_build_audio_jobs_prefers_cover_photo_and_matches_slug_file():
    module = load_audio_sync_module()

    jobs = module.build_audio_jobs(
        [place_payload("rynek-wroclaw")],
        {"rynek-wroclaw": Path("research-exports/place-audio/wroclaw/rynek-wroclaw.mp3")},
    )

    assert len(jobs) == 1
    assert jobs[0].status == "ready"
    assert jobs[0].target_kind == "photo"
    assert jobs[0].target_id == "photo-rynek-wroclaw"
    assert jobs[0].upload_path == "/api/admin/photos/photo-rynek-wroclaw/audio"


def test_build_audio_jobs_skips_places_that_already_have_audio_unless_forced():
    module = load_audio_sync_module()
    place = place_payload("rynek-wroclaw", cover_audio={"public_path": "/media/photos/audio.mp3"})

    skipped_jobs = module.build_audio_jobs(
        [place],
        {"rynek-wroclaw": Path("research-exports/place-audio/wroclaw/rynek-wroclaw.mp3")},
    )
    forced_jobs = module.build_audio_jobs(
        [place],
        {"rynek-wroclaw": Path("research-exports/place-audio/wroclaw/rynek-wroclaw.mp3")},
        force=True,
    )

    assert skipped_jobs[0].status == "already_has_audio"
    assert forced_jobs[0].status == "ready"
    assert forced_jobs[0].target_id == "photo-rynek-wroclaw"


def test_build_audio_jobs_falls_back_to_memory_when_place_has_no_photo():
    module = load_audio_sync_module()
    place = {
        "city_id": "wroclaw",
        "slug": "memory-place",
        "title": "Memory Place",
        "cover_photo": None,
        "preview_items": [
            {
                "kind": "memory",
                "id": "memory-1",
                "public_path": "/media/memories/memory-place.jpg",
                "audio": None,
            }
        ],
    }

    jobs = module.build_audio_jobs(
        [place],
        {"memory-place": Path("research-exports/place-audio/wroclaw/memory-place.flac")},
    )

    assert jobs[0].status == "ready"
    assert jobs[0].target_kind == "memory"
    assert jobs[0].upload_path == "/api/admin/memories/memory-1/audio"


def test_build_audio_jobs_reports_missing_duplicate_and_targetless_cases():
    module = load_audio_sync_module()

    missing = place_payload("missing-audio")
    targetless = {
        "city_id": "wroclaw",
        "slug": "targetless",
        "title": "Targetless",
        "cover_photo": None,
        "preview_items": [],
    }
    duplicate = place_payload("duplicate")

    jobs = module.build_audio_jobs(
        [missing, targetless, duplicate],
        {},
        {"duplicate": [Path("duplicate.mp3"), Path("duplicate.flac")]},
    )

    assert {job.slug: job.status for job in jobs} == {
        "missing-audio": "missing_audio_file",
        "targetless": "no_media_target",
        "duplicate": "duplicate_audio_file",
    }
