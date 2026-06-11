import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image
from sqlmodel import select

from app.models.category import Category
from app.models.city import City
from app.models.guide import Guide, PlaceGuide
from app.models.photo import Photo
from app.models.place import Place, PlaceCategory

ROOT_DIR = Path(__file__).resolve().parents[3]
IMPORT_CITY_PATH = ROOT_DIR / "scripts" / "content" / "import_city.py"


def load_import_city_module():
    spec = importlib.util.spec_from_file_location("import_city", IMPORT_CITY_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def write_icon(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    for x in range(6, 18):
        for y in range(6, 18):
            image.putpixel((x, y), (120, 42, 24, 190))
    image.save(path, format="PNG")


def test_import_city_manifest_upserts_places_icons_and_guides(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_import_city_module()
    icon_path = tmp_path / "assets" / "place-rynek-wroclaw-icon-v01.png"
    manifest_path = tmp_path / "manifest.json"
    write_icon(icon_path)
    session.add(Category(id="local_classic", label="Lokalny klasyk", status="active"))
    session.commit()

    manifest_path.write_text(
        json.dumps(
            {
                "city": {
                    "id": "wroclaw",
                    "name": "Wrocław",
                    "lat": 51.1079,
                    "lon": 17.0385,
                    "default_zoom": 13,
                    "sort_order": 10,
                    "status": "active",
                },
                "places": [
                    {
                        "slug": "rynek-wroclaw",
                        "title": "Rynek",
                        "description": "Serce miasta.",
                        "local_comment": "Najlepiej wcześnie rano albo wieczorem.",
                        "category_ids": ["local_classic"],
                        "lat": 51.109,
                        "lon": 17.032,
                        "weight": 2.0,
                        "status": "published",
                        "cover_icon_path": str(icon_path),
                        "cover_caption": "Ikona Rynku",
                    }
                ],
                "guides": [
                    {
                        "slug": "pierwszy-spacer",
                        "title": "Pierwszy spacer",
                        "description": "Startowa trasa.",
                        "status": "draft",
                        "places": [{"slug": "rynek-wroclaw", "sort_order": 0}],
                    }
                ],
            }
        )
    )

    summary = module.import_city_manifest(manifest_path, session=session)

    place = session.exec(select(Place).where(Place.slug == "rynek-wroclaw")).one()
    city = session.get(City, "wroclaw")
    photo = session.exec(select(Photo)).one()
    place_category = session.exec(select(PlaceCategory)).one()
    guide = session.exec(select(Guide).where(Guide.slug == "pierwszy-spacer")).one()
    place_guide = session.exec(select(PlaceGuide)).one()
    public_file = tmp_path / "public" / photo.public_path.removeprefix("/media/")
    thumb_file = tmp_path / "public" / photo.thumb_path.removeprefix("/media/")

    assert summary.cities_updated == 1
    assert summary.places_created == 1
    assert summary.icons_imported == 1
    assert summary.guides_created == 1
    assert city is not None
    assert place.title == "Rynek"
    assert place.city_id == "wroclaw"
    assert place.status == "published"
    assert place_category.place_id == place.id
    assert place_category.category_id == "local_classic"
    assert place.photo_count == 1
    assert place.cover_photo_id == photo.id
    assert photo.status == "approved"
    assert photo.role == "map_icon"
    assert photo.source == "generated"
    assert photo.public_path.endswith(".png")
    assert photo.thumb_path.endswith(".png")
    assert public_file.exists()
    assert thumb_file.exists()
    with Image.open(public_file) as public_image:
        assert public_image.mode == "RGBA"
        assert public_image.getchannel("A").getextrema()[0] < 255
    assert guide.title == "Pierwszy spacer"
    assert place_guide.guide_id == guide.id
    assert place_guide.place_id == place.id

    second_summary = module.import_city_manifest(manifest_path, session=session)

    assert second_summary.places_updated == 1
    assert second_summary.icons_imported == 0
    assert len(session.exec(select(Photo)).all()) == 1
    assert len(session.exec(select(PlaceGuide)).all()) == 1
