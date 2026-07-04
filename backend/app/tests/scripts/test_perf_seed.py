import importlib.util
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine, select

from app import models as _models  # noqa: F401
from app.models.category import Category
from app.models.photo import Photo
from app.models.place import Place
from app.services.places import list_public_map_places

ROOT_DIR = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT_DIR / "scripts" / "quality" / "perf_seed.py"


def load_perf_seed_module():
    spec = importlib.util.spec_from_file_location("perf_seed", SCRIPT_PATH)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_perf_seed_creates_map_ready_places(monkeypatch, tmp_path: Path) -> None:
    module = load_perf_seed_module()
    data_root = tmp_path / "perf"
    data_dir = data_root / "backend-data"
    storage_root = data_root / "storage"
    db_path = data_dir / "app.db"
    data_dir.mkdir(parents=True)

    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(Category(id="culture", label="Kultura", icon="landmark", sort_order=1, status="active"))
        session.commit()

    monkeypatch.setattr(module, "PERF_DATA_ROOT", data_root)
    monkeypatch.setattr(module, "PERF_DATA_DIR", data_dir)
    monkeypatch.setattr(module, "PERF_STORAGE_DIR", storage_root)
    monkeypatch.setattr(module, "PLACE_COUNT", 4)
    monkeypatch.setattr(module, "GUIDE_COUNT", 2)
    monkeypatch.setattr(module, "PLACES_PER_GUIDE", 2)
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("PHOTOMAP_STORAGE_DIR", storage_root.as_posix())

    module.main()

    with Session(engine) as session:
        places = list(session.exec(select(Place)).all())
        photos = list(session.exec(select(Photo)).all())
        map_places = list_public_map_places(session, "wroclaw")

    assert len(places) == 4
    assert len(photos) == 4
    assert len(map_places) == 4
    assert {place.city_id for place in places} == {"wroclaw"}
    assert all(place.status == "published" for place in places)
    assert all(place.photo_count == 1 for place in places)
    assert all(place.memory_count == 0 for place in places)
    assert all(place.cover_photo_id is not None for place in places)
    assert all(photo.status == "approved" for photo in photos)
    assert all(photo.source == "editorial" for photo in photos)
    assert all(map_place.cover_photo is not None for map_place in map_places)
    assert all(map_place.preview_items for map_place in map_places)

    for number in range(1, 5):
        place_id = f"perf-place-{number:03d}"
        photo_id = f"perf-photo-{number:03d}"
        assert (storage_root / "private" / "photos" / place_id / f"{photo_id}-original.png").is_file()
        assert (storage_root / "public" / "photos" / place_id / f"{photo_id}.png").is_file()
        assert (storage_root / "public" / "photos" / place_id / f"{photo_id}-thumb.png").is_file()
