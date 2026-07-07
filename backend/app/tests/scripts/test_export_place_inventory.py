import importlib.util
import json
import sys
from pathlib import Path

from app.models.category import Category
from app.models.place import Place, PlaceCategory

ROOT_DIR = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT_DIR / "scripts" / "export_place_inventory.py"


def load_inventory_module():
    spec = importlib.util.spec_from_file_location("export_place_inventory", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def create_place(session, *, slug: str, title: str, status: str = "published") -> Place:
    place = Place(
        city_id="wroclaw",
        slug=slug,
        title=title,
        description=f"Opis: {title}",
        lat=51.11,
        lon=17.03,
        status=status,
        local_comment="not for public inventory",
        photo_count=3,
        memory_count=1,
    )
    session.add(place)
    session.commit()
    session.refresh(place)
    return place


def test_inventory_defaults_to_public_active_content(client_session) -> None:
    _, session = client_session
    module = load_inventory_module()
    category = Category(id="market", label="Rynek", description="Place i rynki")
    session.add(category)
    published = create_place(session, slug="rynek-wroclaw", title="Rynek Wrocław")
    create_place(session, slug="draft-place", title="Draft Place", status="draft")
    session.add(PlaceCategory(place_id=published.id, category_id=category.id))
    session.commit()

    inventory = module.build_inventory(
        session,
        base_url="https://example.test",
        generated_at="2026-07-06T07:00:00Z",
    )

    assert inventory["generated_at"] == "2026-07-06T07:00:00Z"
    assert inventory["filters"] == {"city_status": "active", "place_status": "published"}
    assert inventory["summary"] == {"city_count": 1, "place_count": 1}
    assert inventory["cities"][0]["id"] == "wroclaw"
    assert inventory["cities"][0]["place_count"] == 1
    place = inventory["cities"][0]["places"][0]
    assert place["slug"] == "rynek-wroclaw"
    assert place["public"] is True
    assert place["api_path"] == "/api/public/cities/wroclaw/places/rynek-wroclaw"
    assert place["api_url"] == "https://example.test/api/public/cities/wroclaw/places/rynek-wroclaw"
    assert place["page_url"] == "https://example.test/places/wroclaw/rynek-wroclaw"
    assert place["categories"] == [{"id": "market", "label": "Rynek", "description": "Place i rynki"}]
    serialized = json.dumps(inventory, ensure_ascii=False)
    assert "draft-place" not in serialized
    assert "not for public inventory" not in serialized
    assert "original_path" not in serialized


def test_inventory_can_include_non_public_places_without_public_urls(client_session) -> None:
    _, session = client_session
    module = load_inventory_module()
    create_place(session, slug="rynek-wroclaw", title="Rynek Wrocław")
    create_place(session, slug="draft-place", title="Draft Place", status="draft")

    inventory = module.build_inventory(
        session,
        base_url="https://example.test",
        place_status="all",
        generated_at="2026-07-06T07:00:00Z",
    )

    places = {place["slug"]: place for place in inventory["cities"][0]["places"]}
    assert inventory["summary"]["place_count"] == 2
    assert places["rynek-wroclaw"]["public"] is True
    assert places["draft-place"]["public"] is False
    assert places["draft-place"]["api_path"] is None
    assert places["draft-place"]["api_url"] is None
    assert places["draft-place"]["page_path"] is None
    assert places["draft-place"]["page_url"] is None


def test_write_inventory_creates_json_file(tmp_path: Path, client_session) -> None:
    _, session = client_session
    module = load_inventory_module()
    create_place(session, slug="rynek-wroclaw", title="Rynek Wrocław")
    inventory = module.build_inventory(session, generated_at="2026-07-06T07:00:00Z")

    output_path = module.write_inventory(inventory, tmp_path / "research-exports" / "place-inventory.json")

    loaded = json.loads(output_path.read_text(encoding="utf-8"))
    assert loaded["product"] == "PhotoMap"
    assert loaded["summary"]["place_count"] == 1
    assert loaded["ai_prompt_pl"].startswith("To jest lista miast i miejsc")
