import importlib.util
import json
import sys
from pathlib import Path

import pytest
from sqlmodel import select

from app.models.category import Category
from app.models.city import City
from app.models.guide import Guide, PlaceGuide
from app.models.place import Place, PlaceCategory

ROOT_DIR = Path(__file__).resolve().parents[4]
IMPORT_CITY_PATH = ROOT_DIR / "scripts" / "content" / "import_city.py"


def load_import_city_module():
    spec = importlib.util.spec_from_file_location("import_city", IMPORT_CITY_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_import_city_manifest_upserts_places_and_guides(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_import_city_module()
    manifest_path = tmp_path / "manifest.json"
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
                        "article_blocks": [
                            {"type": "heading", "text": "Rynek jako punkt startowy"},
                            {"type": "paragraph", "text": "Najłatwiej czyta się go od bocznych przejść."},
                            {
                                "type": "link",
                                "text": "Materiał zewnętrzny",
                                "url": "https://example.com/rynek-material",
                            },
                        ],
                        "category_ids": ["local_classic"],
                        "lat": 51.109,
                        "lon": 17.032,
                        "weight": 2.0,
                        "status": "published",
                        "custom_fields": {
                            "accessibility": "pełna",
                            "booking_url": "https://example.com/rynek",
                            "opening_hours": " 10-20 ",
                        },
                    }
                ],
                "guides": [
                    {
                        "slug": "pierwszy-spacer",
                        "title": "Pierwszy spacer",
                        "description": "Startowa trasa.",
                        "article_blocks": [
                            {"type": "heading", "text": "Pełny opis spaceru"},
                            {"type": "paragraph", "text": "Trasa prowadzi przez najczytelniejsze punkty miasta."},
                        ],
                        "route_points": [{"lat": 51.109, "lon": 17.032}, {"lat": 51.11, "lon": 17.034}],
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
    place_category = session.exec(select(PlaceCategory)).one()
    guide = session.exec(select(Guide).where(Guide.slug == "pierwszy-spacer")).one()
    place_guide = session.exec(select(PlaceGuide)).one()

    assert summary.cities_updated == 1
    assert summary.places_created == 1
    assert summary.guides_created == 1
    assert city is not None
    assert place.title == "Rynek"
    assert place.city_id == "wroclaw"
    assert place.status == "published"
    assert place.article_blocks == [
        {"type": "heading", "text": "Rynek jako punkt startowy"},
        {"type": "paragraph", "text": "Najłatwiej czyta się go od bocznych przejść."},
        {"type": "link", "text": "Materiał zewnętrzny", "url": "https://example.com/rynek-material"},
    ]
    assert place.custom_fields == {
        "opening_hours": "10-20",
        "booking_url": "https://example.com/rynek",
        "accessibility": "pełna",
    }
    assert place_category.place_id == place.id
    assert place_category.category_id == "local_classic"
    assert place.photo_count == 0
    assert place.cover_photo_id is None
    assert guide.title == "Pierwszy spacer"
    assert guide.article_blocks == [
        {"type": "heading", "text": "Pełny opis spaceru"},
        {"type": "paragraph", "text": "Trasa prowadzi przez najczytelniejsze punkty miasta."},
    ]
    assert guide.route_points == [{"lat": 51.109, "lon": 17.032}, {"lat": 51.11, "lon": 17.034}]
    assert place_guide.guide_id == guide.id
    assert place_guide.place_id == place.id

    second_summary = module.import_city_manifest(manifest_path, session=session)

    assert second_summary.places_updated == 1
    assert len(session.exec(select(PlaceGuide)).all()) == 1


def test_import_city_manifest_dry_run_leaves_database_and_storage_unchanged(
    client_session,
    tmp_path: Path,
) -> None:
    _, session = client_session
    module = load_import_city_module()
    manifest_path = tmp_path / "manifest.json"
    session.add(Category(id="local_classic", label="Lokalny klasyk", status="active"))
    session.commit()

    manifest_path.write_text(
        json.dumps(
            {
                "city": {"id": "wroclaw", "name": "Wrocław", "lat": 51.1079, "lon": 17.0385},
                "places": [
                    {
                        "slug": "dry-run-place",
                        "title": "Dry run",
                        "category_ids": ["local_classic"],
                        "lat": 51.109,
                        "lon": 17.032,
                        "status": "published",
                    }
                ],
                "guides": [],
            }
        )
    )

    summary = module.import_city_manifest(manifest_path, session=session, apply_changes=False)

    assert summary.places_created == 1
    assert session.exec(select(Place).where(Place.slug == "dry-run-place")).all() == []
    assert list((tmp_path / "public").rglob("*")) == []


def test_import_city_manifest_rejects_non_published_guide_places(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_import_city_module()
    manifest_path = tmp_path / "manifest.json"
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
                    "status": "active",
                },
                "places": [
                    {
                        "slug": "draft-place",
                        "title": "Draft place",
                        "category_ids": ["local_classic"],
                        "lat": 51.109,
                        "lon": 17.032,
                        "status": "draft",
                    }
                ],
                "guides": [
                    {
                        "slug": "draft-walk",
                        "title": "Draft walk",
                        "status": "draft",
                        "places": [{"slug": "draft-place", "sort_order": 0}],
                    }
                ],
            }
        )
    )

    with pytest.raises(ValueError) as exc_info:
        module.import_city_manifest(manifest_path, session=session)

    assert str(exc_info.value) == "Guide draft-walk references non-published place: draft-place"


def test_import_city_manifest_rejects_invalid_custom_fields(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_import_city_module()
    manifest_path = tmp_path / "manifest.json"
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
                    "status": "active",
                },
                "places": [
                    {
                        "slug": "bad-custom-field",
                        "title": "Bad custom field",
                        "category_ids": ["local_classic"],
                        "lat": 51.109,
                        "lon": 17.032,
                        "status": "published",
                        "custom_fields": {"booking_url": "example.com"},
                    }
                ],
            }
        )
    )

    with pytest.raises(ValueError) as exc_info:
        module.import_city_manifest(manifest_path, session=session)

    assert "place[bad-custom-field].custom_fields.booking_url must be a valid URL" in str(exc_info.value)


def test_import_city_manifest_rejects_invalid_article_blocks(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_import_city_module()
    manifest_path = tmp_path / "manifest.json"
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
                    "status": "active",
                },
                "places": [
                    {
                        "slug": "bad-article",
                        "title": "Bad article",
                        "category_ids": ["local_classic"],
                        "lat": 51.109,
                        "lon": 17.032,
                        "status": "published",
                        "article_blocks": [{"type": "caption", "text": "Niepoprawny blok"}],
                    }
                ],
            }
        )
    )

    with pytest.raises(ValueError) as exc_info:
        module.import_city_manifest(manifest_path, session=session)

    assert "place[bad-article].article_blocks[0].type must be one of" in str(exc_info.value)

    manifest_path.write_text(
        json.dumps(
            {
                "city": {
                    "id": "wroclaw",
                    "name": "Wrocław",
                    "lat": 51.1079,
                    "lon": 17.0385,
                    "status": "active",
                },
                "places": [
                    {
                        "slug": "bad-link",
                        "title": "Bad link",
                        "category_ids": ["local_classic"],
                        "lat": 51.109,
                        "lon": 17.032,
                        "status": "published",
                        "article_blocks": [{"type": "link", "text": "Link", "url": "javascript:alert(1)"}],
                    }
                ],
            }
        )
    )

    with pytest.raises(ValueError) as link_exc_info:
        module.import_city_manifest(manifest_path, session=session)

    assert "place[bad-link].article_blocks[0].url must be a valid HTTP(S) URL" in str(link_exc_info.value)

    manifest_path.write_text(
        json.dumps(
            {
                "city": {
                    "id": "wroclaw",
                    "name": "Wrocław",
                    "lat": 51.1079,
                    "lon": 17.0385,
                    "status": "active",
                },
                "places": [
                    {
                        "slug": "bad-text-url",
                        "title": "Bad text URL",
                        "category_ids": ["local_classic"],
                        "lat": 51.109,
                        "lon": 17.032,
                        "status": "published",
                        "article_blocks": [
                            {"type": "paragraph", "text": "Opis", "url": "https://example.com/material"}
                        ],
                    }
                ],
            }
        )
    )

    with pytest.raises(ValueError) as text_url_exc_info:
        module.import_city_manifest(manifest_path, session=session)

    assert "place[bad-text-url].article_blocks[0].url is only allowed for link blocks" in str(text_url_exc_info.value)
