import importlib.util
import json
import sys
import zipfile
from datetime import UTC, datetime
from pathlib import Path

from sqlmodel import select

from app.models.category import Category
from app.models.city import City
from app.models.photo import Photo
from app.models.place import Place, PlaceCategory

ROOT_DIR = Path(__file__).resolve().parents[4]
EXPORT_SCRIPT_PATH = ROOT_DIR / "scripts" / "export_place_research.py"


def load_export_module():
    spec = importlib.util.spec_from_file_location("export_place_research", EXPORT_SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def create_place_with_photo(session, private_root: Path) -> tuple[Place, City, Photo]:
    city = session.get(City, "wroclaw")
    assert city is not None
    category = Category(id="local_classic", label="Lokalny klasyk", status="active")
    place = Place(
        id="place-rynek",
        city_id=city.id,
        slug="rynek-wroclaw",
        title="Rynek",
        description="Centralny plac miasta.",
        article_blocks=[{"type": "paragraph", "text": "Pełny opis miejsca."}],
        lat=51.109,
        lon=17.032,
        status="published",
    )
    original_path = Path("photos") / place.id / "rynek-original.jpg"
    private_file = private_root / original_path
    private_file.parent.mkdir(parents=True, exist_ok=True)
    private_file.write_bytes(b"private-original-with-exif")
    photo = Photo(
        id="photo-1",
        place_id=place.id,
        original_path=original_path.as_posix(),
        public_path="/media/photos/place-rynek/rynek.jpg",
        thumb_path="/media/photos/place-rynek/rynek-thumb.jpg",
        status="approved",
        role="cover",
        source="editorial",
        caption="Rynek od strony kamienic.",
        description_blocks=[{"type": "paragraph", "text": "Opis zdjęcia rynku."}],
        attribution_author="Autorka",
        attribution_source_url="https://example.com/photo",
        attribution_license="CC BY 4.0",
        attribution_license_url="https://creativecommons.org/licenses/by/4.0/",
        consent_confirmed=True,
    )
    session.add(category)
    session.add(place)
    session.add(PlaceCategory(place_id=place.id, category_id=category.id, sort_order=1))
    session.add(photo)
    session.commit()
    return place, city, photo


def create_plain_place(session, city: City, *, place_id: str, slug: str, title: str) -> Place:
    place = Place(
        id=place_id,
        city_id=city.id,
        slug=slug,
        title=title,
        description=f"Opis miejsca {title}.",
        article_blocks=[{"type": "paragraph", "text": f"Pełny opis miejsca {title}."}],
        lat=51.11,
        lon=17.04,
        status="published",
    )
    session.add(place)
    session.add(PlaceCategory(place_id=place.id, category_id="local_classic", sort_order=1))
    session.commit()
    return place


def test_search_place_results_matches_case_and_polish_letters(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_export_module()
    create_place_with_photo(session, tmp_path / "private")

    results = module.search_place_results(session, "rynek wroclaw")

    assert results
    assert results[0].place.title == "Rynek"
    assert results[0].city.name == "Wrocław"


def test_search_city_results_matches_case_and_polish_letters(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_export_module()
    create_place_with_photo(session, tmp_path / "private")

    results = module.search_city_results(session, "wroclaw")

    assert results
    assert results[0].city.name == "Wrocław"


def test_export_place_research_archive_contains_text_prompt_metadata_without_private_originals(
    client_session,
    tmp_path: Path,
) -> None:
    _, session = client_session
    module = load_export_module()
    private_root = tmp_path / "private"
    place, city, photo = create_place_with_photo(session, private_root)
    selected = module.PlaceSearchResult(place=place, city=city, score=1.0, reason="test")

    archive_path = module.export_place_research_archive(
        session,
        selected,
        output_root=tmp_path / "research-exports",
        generated_at=datetime(2026, 7, 5, 19, 14, 13, tzinfo=UTC),
    )

    assert archive_path == tmp_path / "research-exports" / "miejsca" / "rynek-wroclaw.zip"
    assert archive_path.name == "rynek-wroclaw.zip"
    assert archive_path.parent.name == "miejsca"
    assert (tmp_path / "research-exports" / "prompt.txt").read_text(encoding="utf-8") == (
        module.CHAT_HANDOFF_PROMPT + "\n"
    )

    with zipfile.ZipFile(archive_path) as archive:
        names = set(archive.namelist())
        assert "PROMPT.md" in names
        assert "tts-guidelines.md" in names
        assert "metadata.json" in names
        assert "review.md" in names
        assert "requested_changes.template.json" in names
        original_name = "photos/001-rynek-od-strony-kamienic-photo-1/original.jpg"
        assert original_name not in names
        assert not any(name.startswith("photos/") for name in names)

        metadata = json.loads(archive.read("metadata.json"))
        template = json.loads(archive.read("requested_changes.template.json"))
        prompt = archive.read("PROMPT.md").decode()
        tts_guidelines = archive.read("tts-guidelines.md").decode()

    assert metadata["schema_version"] == 2
    assert metadata["export"]["contains_private_originals"] is False
    assert metadata["export"]["media_files_included"] is False
    assert metadata["place"]["id"] == place.id
    assert metadata["photos"][0]["id"] == photo.id
    assert metadata["photos"][0]["caption"] == "Rynek od strony kamienic."
    assert metadata["photos"][0]["description_blocks"] == [{"type": "paragraph", "text": "Opis zdjęcia rynku."}]
    assert "files" not in metadata["photos"][0]
    assert "audio" not in metadata["photos"][0]
    assert template["place_changes"]["place_id"] == place.id
    assert template["place_changes"]["action"] == "no_change"
    assert template["photo_text_changes"][0]["photo_id"] == photo.id
    assert template["photo_text_changes"][0]["action"] == "no_change"
    assert "replacement_photo_suggestions" not in template
    assert "Audyt i poprawa opisów PhotoMap" in prompt
    assert "Nie dodawaj, nie usuwaj, nie zastępuj i nie rekomenduj nowych zdjęć" in prompt
    assert "Nie twórz linków ani plików do pobrania" in prompt
    assert "Wklej wynik bezpośrednio w czacie" in prompt
    assert "Porównaj obecną wersję tekstu z proponowaną zmianą" in prompt
    assert "materiałem czytanym przez TTS" in prompt
    assert "Przed oceną i poprawą `description_blocks` przeczytaj `tts-guidelines.md`" in prompt
    assert "zwróć pełną listę bloków, która może zastąpić obecną wersję" in prompt
    assert "Dlugosc I Rytm TTS" in tts_guidelines
    assert "cover albo najmocniejsze ujecie zwykle 1000+ slow" in tts_guidelines
    assert any("finalny tekst gotowy do zapisu w bazie" in item for item in template["instructions"])
    assert any("description_blocks są też materiałem do TTS" in item for item in template["instructions"])

    assert session.exec(select(Photo).where(Photo.id == photo.id)).one().caption == "Rynek od strony kamienic."


def test_export_collection_scopes_create_single_zip_with_place_folders(client_session, tmp_path: Path) -> None:
    _, session = client_session
    module = load_export_module()
    place, city, _ = create_place_with_photo(session, tmp_path / "private")
    second_place = create_plain_place(
        session,
        city,
        place_id="place-hala",
        slug="hala-stulecia",
        title="Hala Stulecia",
    )
    selected_places = [
        module.PlaceSearchResult(place=place, city=city, score=1.0, reason="test"),
        module.PlaceSearchResult(place=second_place, city=city, score=1.0, reason="test"),
    ]

    city_archive = module.export_collection_research_archive(
        session,
        selected_places,
        output_root=tmp_path / "research-exports",
        scope="city",
        title=city.name,
        archive_slug="wroclaw",
        generated_at=datetime(2026, 7, 5, 19, 14, 13, tzinfo=UTC),
    )
    all_archive = module.export_collection_research_archive(
        session,
        selected_places,
        output_root=tmp_path / "research-exports",
        scope="all",
        title="Wszystkie miejsca",
        archive_slug="wszystkie",
        generated_at=datetime(2026, 7, 5, 19, 14, 13, tzinfo=UTC),
    )

    assert city_archive == tmp_path / "research-exports" / "miasta" / "wroclaw.zip"
    assert all_archive == tmp_path / "research-exports" / "wszystkie" / "wszystkie.zip"
    assert (tmp_path / "research-exports" / "prompt.txt").read_text(encoding="utf-8") == (
        module.CHAT_HANDOFF_PROMPT + "\n"
    )

    with zipfile.ZipFile(city_archive) as archive:
        names = set(archive.namelist())
        root_metadata = json.loads(archive.read("metadata.json"))
        assert "PROMPT.md" in names
        assert "README.md" in names
        assert "tts-guidelines.md" in names
        collection_prompt = archive.read("PROMPT.md").decode()
        tts_guidelines = archive.read("tts-guidelines.md").decode()
        assert "rynek-wroclaw/metadata.json" in names
        assert "rynek-wroclaw/review.md" in names
        assert "rynek-wroclaw/requested_changes.template.json" in names
        assert "rynek-wroclaw/PROMPT.md" not in names
        assert "rynek-wroclaw/tts-guidelines.md" not in names
        assert "hala-stulecia/metadata.json" in names
        assert [place["directory"] for place in root_metadata["places"]] == ["rynek-wroclaw", "hala-stulecia"]
        assert "`rynek-wroclaw`: Rynek - Wrocław" in collection_prompt
        assert "`rynek`: Rynek - Wrocław" not in collection_prompt
        assert "Nie twórz linków ani plików do pobrania" in collection_prompt
        assert "pogrupowany według katalogów miejsc" in collection_prompt
        assert "materiałem czytanym przez TTS" in collection_prompt
        assert "Przed oceną i poprawą `description_blocks` przeczytaj `tts-guidelines.md`" in collection_prompt
        assert "Dlugosc I Rytm TTS" in tts_guidelines

    with zipfile.ZipFile(all_archive) as archive:
        names = set(archive.namelist())
        assert "PROMPT.md" in names
        assert "wroclaw/rynek-wroclaw/metadata.json" in names
        assert "wroclaw/hala-stulecia/metadata.json" in names

    city_places = module.place_results_for_city(session, city)
    assert [result.place.id for result in city_places] == [second_place.id, place.id]
