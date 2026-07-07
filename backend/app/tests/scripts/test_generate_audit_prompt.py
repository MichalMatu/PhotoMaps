import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.models.place import Place

ROOT_DIR = Path(__file__).resolve().parents[4]
SCRIPT_PATH = ROOT_DIR / "scripts" / "generate_audit_prompt.py"


def load_prompt_module():
    spec = importlib.util.spec_from_file_location("generate_audit_prompt", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def create_place(session, *, slug: str, title: str, status: str = "published") -> Place:
    place = Place(city_id="wroclaw", slug=slug, title=title, lat=51.11, lon=17.03, status=status)
    session.add(place)
    session.commit()
    session.refresh(place)
    return place


def test_audit_prompt_selection_uses_public_places_only(client_session) -> None:
    _, session = client_session
    module = load_prompt_module()
    city = session.get(module.City, "wroclaw")
    assert city is not None
    published = create_place(session, slug="rynek-wroclaw", title="Rynek Wrocław")
    create_place(session, slug="draft-place", title="Draft Place", status="draft")

    places = module.public_places_for_city(session, city)

    assert [place.id for place in places] == [published.id]
    assert module.select_city_by_query(session, "wroclaw", require_places=True).id == city.id
    assert module.select_place_by_query(session, city, "rynek").id == published.id
    assert module.select_place_by_query(session, city, "draft") is None


def test_build_prompt_links_public_api_and_writes_output(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_prompt_module()
    city = session.get(module.City, "wroclaw")
    assert city is not None
    place = create_place(session, slug="rynek-wroclaw", title="Rynek Wrocław")
    selection = module.PromptSelection(scope="place", city=city, place=place)

    prompt = module.build_prompt(
        selection,
        field_keys=("description", "photo_blocks"),
        audit_keys=("tts", "ai"),
        base_url="https://example.test",
    )
    output_path = module.write_prompt(prompt, tmp_path / "research-exports" / "prompt.txt")

    assert output_path.read_text(encoding="utf-8") == prompt
    assert "https://example.test/llms.txt" in prompt
    assert "https://example.test/api/public/cities/wroclaw/places/rynek-wroclaw" in prompt
    assert "Audytuj tylko miejsce: `rynek-wroclaw` - Rynek Wrocław, Wrocław." in prompt
    assert "`description` - główny opis miejsca" in prompt
    assert "`photos[].description_blocks[].text`" in prompt
    assert "TTS i naturalność lektora" in prompt
    assert "## Standard TTS PhotoMap" in prompt
    assert "`photos[].caption` to krótki podpis zdjęcia, maksymalnie 120 znaków." in prompt
    assert "Flaguj ogólniki typu `miejsce ma pamięć`" in prompt
    assert "czytelność dla agentów AI" in prompt
    assert "W `stary tekst` nie używaj wielokropków" in prompt
    assert "W kolumnie `pewność` używaj tylko: `wysoka`, `średnia`, `niska`." in prompt
    assert "| miejsce | gdzie | stary tekst | nowy tekst | powód | pewność |" in prompt
    assert "original_path" not in prompt


def test_build_city_prompt_uses_place_index_and_api_path_instruction(client_session) -> None:
    _, session = client_session
    module = load_prompt_module()
    city = session.get(module.City, "wroclaw")
    assert city is not None
    create_place(session, slug="rynek-wroclaw", title="Rynek Wrocław")
    selection = module.PromptSelection(scope="city", city=city)

    prompt = module.build_prompt(
        selection,
        field_keys=("article_blocks",),
        audit_keys=("seo",),
        base_url="https://example.test",
    )

    assert "https://example.test/api/public/cities/wroclaw/places" in prompt
    assert "Dla każdego elementu z listy pobierz szczegółowy JSON przez pole `api_path`." in prompt
    assert "Jeśli `api_path` jest relatywne, połącz je z `https://example.test`." in prompt
    assert "Audytuj wszystkie miejsca zwrócone dla miasta Wrocław." in prompt
    assert "`article_blocks[].text`" in prompt
    assert "SEO bez marketingowego tonu" in prompt
    assert "## Standard TTS PhotoMap" not in prompt


def test_noninteractive_city_query_defaults_to_city_scope(client_session, monkeypatch: pytest.MonkeyPatch) -> None:
    _, session = client_session
    module = load_prompt_module()
    create_place(session, slug="rynek-wroclaw", title="Rynek Wrocław")

    monkeypatch.setattr(module.sys, "stdin", SimpleNamespace(isatty=lambda: False))
    selection = module.select_prompt_target(
        session,
        SimpleNamespace(scope=None, city="wroclaw", place=None),
    )

    assert selection.scope == "city"
    assert selection.city.id == "wroclaw"
    assert selection.place is None


def test_noninteractive_unknown_place_fails_without_prompting(
    client_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _, session = client_session
    module = load_prompt_module()
    create_place(session, slug="rynek-wroclaw", title="Rynek Wrocław")

    monkeypatch.setattr(module.sys, "stdin", SimpleNamespace(isatty=lambda: False))
    with pytest.raises(ValueError, match="No unique public place"):
        module.select_prompt_target(
            session,
            SimpleNamespace(scope=None, city="wroclaw", place="missing"),
        )
