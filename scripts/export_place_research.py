#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from sqlmodel import Session, select

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402,F401
from app.core.config import DATABASE_PATH, DATABASE_URL  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.models.category import Category  # noqa: E402
from app.models.city import City  # noqa: E402
from app.models.photo import Photo  # noqa: E402
from app.models.place import Place, PlaceCategory  # noqa: E402

DEFAULT_OUTPUT_ROOT = REPO_ROOT / "research-exports"
TTS_GUIDELINES_PATH = REPO_ROOT / "docs" / "create_tts.md"
SEARCH_LIMIT = 30
SIMILARITY_THRESHOLD = 0.35
EXPORT_SCOPE_DIRS = {
    "place": "miejsca",
    "city": "miasta",
    "all": "wszystkie",
}
CHAT_HANDOFF_PROMPT = (
    "Otwórz załączony plik ZIP. Najpierw przeczytaj PROMPT.md i wykonaj dokładnie instrukcje z tego pliku. "
    "Jeśli ZIP zawiera katalogi miejsc, pracuj na metadata.json i tts-guidelines.md z głównego katalogu oraz "
    "na metadata.json, review.md i requested_changes.template.json w każdym katalogu miejsca. "
    "Nie analizuj prompt.txt. Nie twórz linków ani plików do pobrania. Wklej wynik bezpośrednio w czacie jako "
    "sekcje audit-summary.md, requested_changes.json i sources.md dla każdego analizowanego miejsca."
)

POLISH_TRANSLATION = str.maketrans(
    {
        "ą": "a",
        "ć": "c",
        "ę": "e",
        "ł": "l",
        "ń": "n",
        "ó": "o",
        "ś": "s",
        "ź": "z",
        "ż": "z",
        "Ą": "A",
        "Ć": "C",
        "Ę": "E",
        "Ł": "L",
        "Ń": "N",
        "Ó": "O",
        "Ś": "S",
        "Ź": "Z",
        "Ż": "Z",
    }
)


@dataclass(frozen=True)
class PlaceSearchResult:
    place: Place
    city: City
    score: float
    reason: str


@dataclass(frozen=True)
class CitySearchResult:
    city: City
    score: float
    reason: str


def normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    translated = value.translate(POLISH_TRANSLATION)
    decomposed = unicodedata.normalize("NFKD", translated)
    ascii_text = "".join(char for char in decomposed if not unicodedata.combining(char))
    lowered = ascii_text.casefold()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", lowered)).strip()


def slugify(value: str | None, *, fallback: str) -> str:
    normalized = normalize_text(value)
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return slug or fallback


def place_slug_for_path(place: Place) -> str:
    return slugify(place.slug, fallback=slugify(place.title, fallback=place.id))


def score_query(query: str, fields: list[tuple[str, str]]) -> tuple[float, str]:
    normalized_query = normalize_text(query)
    if not normalized_query:
        return 0.0, "empty"

    best_score = 0.0
    best_reason = "similar"
    for label, raw_field in fields:
        field = normalize_text(raw_field)
        if not field:
            continue
        if normalized_query == field:
            return 1.0, f"exact {label}"
        if normalized_query in field:
            score = max(0.8, 0.95 - (len(field) - len(normalized_query)) / 200)
            if score > best_score:
                best_score = score
                best_reason = f"contains {label}"
        ratio = SequenceMatcher(None, normalized_query, field).ratio()
        if ratio > best_score:
            best_score = ratio
            best_reason = f"similar {label}"
    return best_score, best_reason


def place_fields(place: Place, city: City) -> list[tuple[str, str]]:
    return [
        ("place", place.title),
        ("place_slug", place.slug),
        ("city", city.name),
        ("city_id", city.id),
        ("place_city", f"{place.title} {city.name}"),
        ("city_place", f"{city.name} {place.title}"),
    ]


def city_fields(city: City) -> list[tuple[str, str]]:
    return [
        ("city", city.name),
        ("city_id", city.id),
        ("region", city.region or ""),
    ]


def all_place_results(session: Session) -> list[PlaceSearchResult]:
    rows = session.exec(select(Place, City).where(Place.city_id == City.id).order_by(City.name, Place.title)).all()
    return [PlaceSearchResult(place=place, city=city, score=0.0, reason="all") for place, city in rows]


def all_city_results(session: Session) -> list[CitySearchResult]:
    rows = session.exec(select(City).order_by(City.name)).all()
    return [CitySearchResult(city=city, score=0.0, reason="all") for city in rows]


def search_place_results(
    session: Session,
    query: str | None = None,
    *,
    city_query: str | None = None,
    place_query: str | None = None,
    limit: int = SEARCH_LIMIT,
) -> list[PlaceSearchResult]:
    results: list[PlaceSearchResult] = []
    for result in all_place_results(session):
        if city_query or place_query:
            city_score, city_reason = score_query(
                city_query or "",
                [("city", result.city.name), ("city_id", result.city.id)],
            )
            place_score, place_reason = score_query(
                place_query or "",
                [("place", result.place.title), ("place_slug", result.place.slug)],
            )
            score = min(city_score or 1.0, place_score or 1.0)
            reason = f"{city_reason}; {place_reason}"
        else:
            score, reason = score_query(query or "", place_fields(result.place, result.city))
        if score >= SIMILARITY_THRESHOLD:
            results.append(
                PlaceSearchResult(
                    place=result.place,
                    city=result.city,
                    score=score,
                    reason=reason,
                )
            )
    return sorted(results, key=lambda item: (-item.score, item.city.name, item.place.title))[:limit]


def search_city_results(session: Session, query: str | None, *, limit: int = SEARCH_LIMIT) -> list[CitySearchResult]:
    results: list[CitySearchResult] = []
    for result in all_city_results(session):
        score, reason = score_query(query or "", city_fields(result.city))
        if score >= SIMILARITY_THRESHOLD:
            results.append(CitySearchResult(city=result.city, score=score, reason=reason))
    return sorted(results, key=lambda item: (-item.score, item.city.name))[:limit]


def place_results_for_city(session: Session, city: City) -> list[PlaceSearchResult]:
    rows = session.exec(select(Place).where(Place.city_id == city.id).order_by(Place.title)).all()
    return [PlaceSearchResult(place=place, city=city, score=1.0, reason="city") for place in rows]


def prompt_for_query() -> str | None:
    while True:
        value = input("Wpisz miasto albo miejsce (q aby przerwać): ").strip()
        if value.casefold() in {"q", "quit", "exit"}:
            return None
        if value:
            return value


def prompt_for_city_query() -> str | None:
    while True:
        value = input("Wpisz miasto (q aby przerwać): ").strip()
        if value.casefold() in {"q", "quit", "exit"}:
            return None
        if value:
            return value


def choose_result(results: list[PlaceSearchResult]) -> PlaceSearchResult | None:
    if not results:
        print("Nie znaleziono pasujących miejsc.")
        return None
    exact_results = [result for result in results if result.score >= 1.0]
    if len(results) == 1 or len(exact_results) == 1:
        result = exact_results[0] if exact_results else results[0]
        print(f"Znaleziono: {result.place.title} - {result.city.name}")
        return result
    if exact_results:
        results = exact_results

    if len(results) == 1:
        result = results[0]
        print(f"Znaleziono: {result.place.title} - {result.city.name}")
        return result

    print("Znalezione miejsca:")
    for index, result in enumerate(results, start=1):
        score = f"{result.score:.2f}"
        print(f"{index:2}. {result.place.title} - {result.city.name} ({result.place.slug}, score {score})")

    while True:
        value = input("Wybierz numer albo q, żeby przerwać: ").strip()
        if value.casefold() in {"q", "quit", "exit"}:
            return None
        if value.isdigit():
            index = int(value)
            if 1 <= index <= len(results):
                return results[index - 1]
        print("Podaj numer z listy albo q.")


def choose_city_result(results: list[CitySearchResult]) -> CitySearchResult | None:
    if not results:
        print("Nie znaleziono pasujących miast.")
        return None
    exact_results = [result for result in results if result.score >= 1.0]
    if len(results) == 1 or len(exact_results) == 1:
        result = exact_results[0] if exact_results else results[0]
        print(f"Znaleziono miasto: {result.city.name}")
        return result
    if exact_results:
        results = exact_results

    if len(results) == 1:
        result = results[0]
        print(f"Znaleziono miasto: {result.city.name}")
        return result

    print("Znalezione miasta:")
    for index, result in enumerate(results, start=1):
        score = f"{result.score:.2f}"
        print(f"{index:2}. {result.city.name} ({result.city.id}, score {score})")

    while True:
        value = input("Wybierz numer albo q, żeby przerwać: ").strip()
        if value.casefold() in {"q", "quit", "exit"}:
            return None
        if value.isdigit():
            index = int(value)
            if 1 <= index <= len(results):
                return results[index - 1]
        print("Podaj numer z listy albo q.")


def confirm(question: str) -> bool:
    value = input(f"{question} [Enter = tak, q = nie]: ").strip()
    return value.casefold() not in {"q", "n", "no", "nie"}


def datetime_value(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.isoformat().replace("+00:00", "Z")


def json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return datetime_value(value)
    if isinstance(value, Path):
        return value.as_posix()
    if isinstance(value, dict):
        return {key: json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    return value


def photo_to_metadata(index: int, photo: Photo) -> dict[str, Any]:
    return {
        "id": photo.id,
        "place_id": photo.place_id,
        "index": index,
        "status": photo.status,
        "role": photo.role,
        "source": photo.source,
        "caption": photo.caption,
        "description_blocks": photo.description_blocks or [],
        "attribution": {
            "author": photo.attribution_author,
            "source_url": photo.attribution_source_url,
            "license": photo.attribution_license,
            "license_url": photo.attribution_license_url,
        },
        "consent_confirmed": photo.consent_confirmed,
        "created_at": datetime_value(photo.created_at),
        "approved_at": datetime_value(photo.approved_at),
        "has_public_image": photo.public_path is not None,
        "has_audio": photo.audio_public_path is not None or photo.audio_original_path is not None,
    }


def category_metadata(session: Session, place: Place) -> list[dict[str, Any]]:
    place_categories = session.exec(
        select(PlaceCategory)
        .where(PlaceCategory.place_id == place.id)
        .order_by(PlaceCategory.sort_order, PlaceCategory.category_id)
    ).all()
    categories: list[dict[str, Any]] = []
    for place_category in place_categories:
        category = session.get(Category, place_category.category_id)
        categories.append(
            {
                "id": place_category.category_id,
                "sort_order": place_category.sort_order,
                "label": category.label if category else None,
                "description": category.description if category else None,
                "icon": category.icon if category else None,
                "status": category.status if category else None,
            }
        )
    return categories


def build_metadata(
    session: Session,
    selected: PlaceSearchResult,
    photos: list[Photo],
    generated_at: datetime,
) -> dict[str, Any]:
    place = selected.place
    city = selected.city
    return {
        "schema_version": 2,
        "export": {
            "kind": "description_research",
            "generated_at": datetime_value(generated_at),
            "contains_private_originals": False,
            "media_files_included": False,
            "privacy_notice": (
                "Paczka zawiera tylko tekstowe metadane opisów. " "Nie zawiera prywatnych oryginałów ani EXIF."
            ),
        },
        "city": {
            "id": city.id,
            "name": city.name,
            "region": city.region,
            "lat": city.lat,
            "lon": city.lon,
            "default_zoom": city.default_zoom,
            "sort_order": city.sort_order,
            "status": city.status,
        },
        "place": {
            "id": place.id,
            "city_id": place.city_id,
            "slug": place.slug,
            "title": place.title,
            "description": place.description,
            "local_comment": place.local_comment,
            "article_blocks": place.article_blocks or [],
            "lat": place.lat,
            "lon": place.lon,
            "weight": place.weight,
            "status": place.status,
            "custom_fields": place.custom_fields or {},
            "photo_count": place.photo_count,
            "memory_count": place.memory_count,
            "cover_photo_id": place.cover_photo_id,
            "created_at": datetime_value(place.created_at),
            "updated_at": datetime_value(place.updated_at),
            "categories": category_metadata(session, place),
        },
        "photos": [photo_to_metadata(index, photo) for index, photo in enumerate(photos, start=1)],
    }


def description_text(blocks: list[dict[str, str]]) -> str:
    if not blocks:
        return "_Brak description_blocks._"
    lines = []
    for block in blocks:
        block_type = block.get("type", "paragraph")
        text = block.get("text", "")
        url = block.get("url")
        if url:
            lines.append(f"- `{block_type}`: {text} ({url})")
        else:
            lines.append(f"- `{block_type}`: {text}")
    return "\n".join(lines)


def read_tts_guidelines() -> str:
    return TTS_GUIDELINES_PATH.read_text(encoding="utf-8")


def build_readme(metadata: dict[str, Any]) -> str:
    return f"""# PhotoMap Research Export

Ta paczka jest roboczym eksportem do audytu i poprawy opisów PhotoMap.

## Poufność

Paczka zawiera tylko tekstowe metadane miejsca i istniejących zdjęć. Nie zawiera
prywatnych oryginałów, EXIF ani lokalnych ścieżek storage.

## Zawartość

- `PROMPT.md` - prompt do Deep Research.
- `metadata.json` - dane tekstowe miejsca i opisów istniejących zdjęć.
- `review.md` - czytelny widok danych do analizy.
- `tts-guidelines.md` - standard PhotoMap dla opisów widocznych i TTS.
- `requested_changes.template.json` - format odpowiedzi do późniejszego wprowadzenia poprawek.

## Miejsce

- Miasto: {metadata["city"]["name"]}
- Miejsce: {metadata["place"]["title"]}
- Slug: `{metadata["place"]["slug"]}`
- Liczba zdjęć w eksporcie: {len(metadata["photos"])}
"""


def build_place_folder_readme(metadata: dict[str, Any]) -> str:
    return f"""# {metadata["place"]["title"]} - {metadata["city"]["name"]}

Ten katalog zawiera tekstowe dane jednego miejsca do audytu opisów PhotoMap.
Wspólny prompt oraz standard TTS dla całej paczki znajdują się w głównym katalogu ZIP
jako `PROMPT.md` i `tts-guidelines.md`.

## Zawartość

- `metadata.json` - dane tekstowe miejsca i opisów istniejących zdjęć.
- `review.md` - czytelny widok danych do analizy.
- `requested_changes.template.json` - format odpowiedzi do późniejszego wprowadzenia poprawek.
"""


def build_prompt(metadata: dict[str, Any]) -> str:
    return f"""# Audyt i poprawa opisów PhotoMap

Jesteś redaktorem i fact-checkerem PhotoMap. Twoim zadaniem jest kompleksowo sprawdzić
i poprawić opisy jednego miejsca oraz teksty przypisane do istniejących zdjęć.

Nie dodawaj, nie usuwaj, nie zastępuj i nie rekomenduj nowych zdjęć. W tej paczce nie ma
plików graficznych, więc nie oceniaj kadru ani zgodności obrazu ze zdjęciem. Pracuj
wyłącznie na danych tekstowych, faktach o miejscu i obecnych podpisach/opisach.

## Kontekst

- Produkt: PhotoMap
- Miasto: {metadata["city"]["name"]}
- Miejsce: {metadata["place"]["title"]}
- Id miejsca: `{metadata["place"]["id"]}`
- Liczba istniejących wpisów zdjęć z opisami: {len(metadata["photos"])}

## Materiały

W paczce znajdują się:

- `metadata.json` - tekstowe metadane miejsca i istniejących wpisów zdjęć z bazy PhotoMap.
- `review.md` - czytelny opis obecnych tekstów do analizy.
- `tts-guidelines.md` - standard PhotoMap dla opisów widocznych i TTS.
- `requested_changes.template.json` - format zmian, który należy wypełnić, jeśli rekomendujesz poprawki.

Traktuj paczkę jako materiał roboczy. Nie twórz osobnych plików zdjęć i nie proponuj
importu nowych mediów.

## Cel

Sprawdź, czy obecne teksty są prawdziwe, konkretne, naturalne i przydatne dla użytkownika
PhotoMap. Popraw opis miejsca, `article_blocks`, `local_comment`, podpisy `caption` i
`description_blocks` istniejących zdjęć tam, gdzie tekst jest słaby, przesadzony,
nieprecyzyjny albo trudny do potwierdzenia.

## Zakres analizy

Sprawdź:

1. Czy opis miejsca jest zgodny z realnym obiektem i nie zawiera zmyślonych faktów.
2. Czy `article_blocks` są uporządkowane, krótkie i przydatne w kontekście PhotoMap.
3. Czy `local_comment` brzmi naturalnie i pomaga w doświadczeniu miejsca.
4. Czy podpisy `caption` istniejących zdjęć są konkretne, krótkie i nie obiecują rzeczy,
   których nie da się potwierdzić bez obrazu.
5. Czy `description_blocks` istniejących zdjęć są poprawne faktograficznie, redakcyjne i nie brzmią marketingowo.
6. Czy teksty unikają przesady, fałszywej pewności, pustej poetyckości i zbyt długich akapitów.
7. Czy warto dodać notatkę `needs_manual_review`, gdy tekst zależy od tego, co faktycznie widać na zdjęciu.

## Porównanie wersji i gotowe zmiany

Porównaj obecną wersję tekstu z proponowaną zmianą. W `audit-summary.md` dla każdego
ważnego `update_text` napisz krótko, co było problemem w obecnej wersji i co poprawia
nowa wersja. Nie oceniaj tylko abstrakcyjnie: odnos się do pól z `metadata.json`.

`requested_changes.json` ma zawierać finalne teksty gotowe do wprowadzenia do bazy,
nie skrót, szkic ani samą notatkę redakcyjną. Jeśli zmieniasz `description_blocks`,
zwróć pełną listę bloków, która może zastąpić obecną wersję.

## Weryfikacja faktów

Korzystaj z aktualnych, wiarygodnych źródeł. Nie zgaduj. Jeśli nie da się czegoś
potwierdzić, oznacz to jako niepewne. Przy każdej istotnej korekcie faktu podaj źródło
albo krótką notatkę, dlaczego obecny opis jest ryzykowny.

Preferuj źródła oficjalne, miejskie, instytucjonalne, muzealne, encyklopedyczne lub dobrze
opisane strony obiektu.

## Ton opisów PhotoMap

Poprawione opisy mają być po polsku. Styl: konkretny, naturalny, redakcyjny, bez przesadnej
poetyckości i bez pustego marketingu. Opis ma pomagać użytkownikowi zrozumieć miejsce,
jego charakter i powód, dla którego warto je zobaczyć.

Przed oceną i poprawą `description_blocks` przeczytaj `tts-guidelines.md`. Ten plik jest
standardem PhotoMap dla opisów zdjęć, overlayu i TTS. W razie konfliktu z ogólną zasadą
skracania tekstu trzymaj się `tts-guidelines.md`: opis ma być konkretny, warstwowy,
przewodnicki i gotowy do odsłuchu, a nie streszczony do krótkiej notki.

`description_blocks` są widocznym opisem zdjęcia i materiałem czytanym przez TTS w
przeglądarce. Nie skracaj ich mechanicznie tylko dlatego, że obecna wersja jest długa.
Usuń puste metafory, fałszywą pewność i powtórzenia, ale zachowaj warstwową wartość
przewodnicką, jeśli tekst ma dobre fakty i naturalnie działa do odsłuchu.

Nie twórz długich tekstów bez treści. Jeśli nie da się potwierdzić dokładnego faktu,
nie dopisuj go. Nie wymyślaj tego, co może być widoczne na zdjęciu.

## Format odpowiedzi

Nie twórz linków ani plików do pobrania. Wklej wynik bezpośrednio w czacie jako trzy
sekcje:

1. `audit-summary.md`
   Krótkie podsumowanie jakości paczki, najważniejsze problemy i priorytety poprawek.

2. `requested_changes.json`
   Wypełniony plik zmian zgodny z `requested_changes.template.json`.

3. `sources.md`
   Lista źródeł użytych do fact-checkingu.

W `requested_changes.json` używaj istniejących `place_id` i `photo_id` z `metadata.json`.
Nie zmieniaj identyfikatorów. Nie dodawaj wpisów dla nowych zdjęć. Jeśli nie rekomendujesz
zmiany dla wpisu, ustaw `action` na `no_change` albo usuń wpis z listy zmian.

Każdą sekcję wklej w osobnym bloku markdown. `requested_changes.json` wklej jako pełny,
poprawny składniowo blok `json`, bez skracania i bez pomijania elementów `photo_text_changes`.

## Priorytety

Najważniejsze są:

1. Prawdziwość faktów.
2. Jakość i naturalność opisów.
3. Użyteczność tekstu w PhotoMap.
4. Brak zmyślania i brak fałszywej pewności.
5. Łatwość późniejszego wprowadzenia zmian do bazy.
"""


def build_collection_prompt(title: str, selected_places: list[PlaceSearchResult]) -> str:
    places = "\n".join(
        f"- `{place_slug_for_path(selected.place)}`: {selected.place.title} - {selected.city.name}"
        for selected in selected_places
    )
    return f"""# Audyt i poprawa opisów PhotoMap - {title}

Jesteś redaktorem i fact-checkerem PhotoMap. Ta paczka zawiera wiele katalogów miejsc.
Twoim zadaniem jest kompleksowo sprawdzić i poprawić opisy każdego miejsca oraz teksty
przypisane do istniejących zdjęć.

Nie dodawaj, nie usuwaj, nie zastępuj i nie rekomenduj nowych zdjęć. W tej paczce nie ma
plików graficznych, więc nie oceniaj kadru ani zgodności obrazu ze zdjęciem. Pracuj
wyłącznie na danych tekstowych, faktach o miejscu i obecnych podpisach/opisach.

## Miejsca w paczce

{places}

## Struktura paczki

W głównym katalogu znajdują się:

- `PROMPT.md` - ten prompt.
- `README.md` - opis paczki.
- `metadata.json` - indeks miejsc w paczce.
- `tts-guidelines.md` - wspólny standard PhotoMap dla opisów widocznych i TTS.

Każdy katalog miejsca zawiera:

- `metadata.json` - tekstowe metadane miejsca i istniejących wpisów zdjęć z bazy PhotoMap.
- `review.md` - czytelny opis obecnych tekstów do analizy.
- `requested_changes.template.json` - format zmian, który należy wypełnić, jeśli rekomendujesz poprawki.

## Cel

Dla każdego miejsca sprawdź, czy obecne teksty są prawdziwe, konkretne, naturalne i przydatne
dla użytkownika PhotoMap. Popraw opis miejsca, `article_blocks`, `local_comment`, podpisy
`caption` i `description_blocks` istniejących zdjęć tam, gdzie tekst jest słaby, przesadzony,
nieprecyzyjny albo trudny do potwierdzenia.

## Porównanie wersji i gotowe zmiany

Porównaj obecną wersję tekstu z proponowaną zmianą. W `audit-summary.md` dla każdego
ważnego `update_text` napisz krótko, co było problemem w obecnej wersji i co poprawia
nowa wersja. Nie oceniaj tylko abstrakcyjnie: odnos się do pól z lokalnego `metadata.json`.

`requested_changes.json` ma zawierać finalne teksty gotowe do wprowadzenia do bazy,
nie skrót, szkic ani samą notatkę redakcyjną. Jeśli zmieniasz `description_blocks`,
zwróć pełną listę bloków, która może zastąpić obecną wersję.

## Weryfikacja faktów

Korzystaj z aktualnych, wiarygodnych źródeł. Nie zgaduj. Jeśli nie da się czegoś
potwierdzić, oznacz to jako niepewne. Przy każdej istotnej korekcie faktu podaj źródło
albo krótką notatkę, dlaczego obecny opis jest ryzykowny.

## Ton opisów PhotoMap

Poprawione opisy mają być po polsku. Styl: konkretny, naturalny, redakcyjny, bez przesadnej
poetyckości i bez pustego marketingu. `description_blocks` są widocznym opisem zdjęcia
i materiałem czytanym przez TTS w przeglądarce. Nie skracaj ich mechanicznie tylko dlatego,
że obecna wersja jest długa. Usuń puste metafory, fałszywą pewność i powtórzenia, ale
zachowaj warstwową wartość przewodnicką, jeśli tekst ma dobre fakty i naturalnie działa
do odsłuchu.

Przed oceną i poprawą `description_blocks` przeczytaj `tts-guidelines.md`. Ten plik jest
standardem PhotoMap dla opisów zdjęć, overlayu i TTS. W razie konfliktu z ogólną zasadą
skracania tekstu trzymaj się `tts-guidelines.md`: opis ma być konkretny, warstwowy,
przewodnicki i gotowy do odsłuchu, a nie streszczony do krótkiej notki.

## Format odpowiedzi

Nie twórz linków ani plików do pobrania. Nie próbuj generować załączników. Wklej wynik
bezpośrednio w czacie, pogrupowany według katalogów miejsc. Dla każdego miejsca, które
wymaga zmian, przygotuj trzy sekcje:

1. `audit-summary.md`
   Krótkie podsumowanie jakości opisu i priorytety poprawek.

2. `requested_changes.json`
   Wypełniony plik zmian zgodny z `requested_changes.template.json` z katalogu tego miejsca.

3. `sources.md`
   Lista źródeł użytych do fact-checkingu.

W `requested_changes.json` używaj istniejących `place_id` i `photo_id` z lokalnego
`metadata.json`. Nie zmieniaj identyfikatorów. Nie dodawaj wpisów dla nowych zdjęć.

Każdą sekcję wklej w osobnym bloku markdown. Każdy `requested_changes.json` wklej jako
pełny, poprawny składniowo blok `json`, bez skracania i bez pomijania elementów
`photo_text_changes`.

## Priorytety

1. Prawdziwość faktów.
2. Jakość i naturalność opisów.
3. Użyteczność tekstu w PhotoMap.
4. Brak zmyślania i brak fałszywej pewności.
5. Łatwość późniejszego wprowadzenia zmian do bazy.
"""


def build_collection_readme(title: str, selected_places: list[PlaceSearchResult]) -> str:
    place_lines = "\n".join(
        f"- `{place_slug_for_path(selected.place)}` - {selected.place.title} ({selected.city.name})"
        for selected in selected_places
    )
    return f"""# PhotoMap Research Export - {title}

Ta paczka jest zbiorczym eksportem do audytu i poprawy opisów PhotoMap.
Zawiera tylko tekstowe metadane opisów. Nie zawiera zdjęć, prywatnych oryginałów,
EXIF ani lokalnych ścieżek storage.

## Zawartość

- `PROMPT.md` - wspólny prompt do Deep Research.
- `metadata.json` - indeks miejsc w paczce.
- `tts-guidelines.md` - wspólny standard PhotoMap dla opisów widocznych i TTS.
- katalogi miejsc - osobne dane i template poprawek dla każdego miejsca.

## Miejsca

{place_lines}
"""


def build_review(metadata: dict[str, Any]) -> str:
    place = metadata["place"]
    city = metadata["city"]
    lines = [
        "# PhotoMap Place Review",
        "",
        f"## {place['title']} - {city['name']}",
        "",
        f"- Place ID: `{place['id']}`",
        f"- City ID: `{city['id']}`",
        f"- Status miejsca: `{place['status']}`",
        f"- Slug: `{place['slug']}`",
        f"- Współrzędne: `{place['lat']}, {place['lon']}`",
        f"- Liczba istniejących wpisów zdjęć: `{len(metadata['photos'])}`",
        "",
        "## Opis miejsca",
        "",
        place["description"] or "_Brak krótkiego opisu miejsca._",
        "",
        "## Local Comment",
        "",
        place["local_comment"] or "_Brak local_comment._",
        "",
        "## Article Blocks Miejsca",
        "",
        description_text(place["article_blocks"]),
        "",
        "## Kategorie",
        "",
    ]
    if place["categories"]:
        for category in place["categories"]:
            lines.append(f"- `{category['id']}` - {category['label']} ({category['status']})")
    else:
        lines.append("_Brak kategorii._")

    lines.extend(
        [
            "",
            "## Teksty istniejących zdjęć",
            "",
            "Paczka nie zawiera plików graficznych. Poniższe wpisy służą wyłącznie do poprawy podpisów i opisów.",
            "",
        ]
    )
    for photo in metadata["photos"]:
        lines.extend(
            [
                f"### {photo['index']:03d}. {photo['caption'] or photo['id']}",
                "",
                f"- Photo ID: `{photo['id']}`",
                f"- Status: `{photo['status']}`",
                f"- Role/source: `{photo['role']}` / `{photo['source']}`",
                f"- Ma publiczny obraz w bazie: `{photo['has_public_image']}`",
                f"- Ma audio w bazie: `{photo['has_audio']}`",
                "",
                "Caption:",
                "",
                photo["caption"] or "_Brak caption._",
                "",
                "Description blocks:",
                "",
                description_text(photo["description_blocks"]),
                "",
            ]
        )
    return "\n".join(lines)


def build_requested_changes_template(metadata: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": 2,
        "place": {
            "place_id": metadata["place"]["id"],
            "place_slug": metadata["place"]["slug"],
            "place_title": metadata["place"]["title"],
            "city_id": metadata["city"]["id"],
            "city_name": metadata["city"]["name"],
        },
        "instructions": [
            "Pracuj wyłącznie na tekstach. Nie dodawaj, nie usuwaj i nie zastępuj zdjęć.",
            "Ustaw action na no_change, update_text albo needs_manual_review.",
            "Nie zmieniaj place_id ani photo_id.",
            "description_blocks powinny być listą bloków zgodnych z PhotoMap: paragraph, "
            "heading, subheading albo link.",
            "Jeśli action=update_text, zwróć finalny tekst gotowy do zapisu w bazie, nie streszczenie.",
            "description_blocks są też materiałem do TTS, więc nie skracaj ich mechanicznie bez powodu.",
        ],
        "place_changes": {
            "place_id": metadata["place"]["id"],
            "action": "no_change",
            "priority": "medium",
            "description": None,
            "local_comment": None,
            "article_blocks": None,
            "fact_check_notes": "",
            "sources": [],
        },
        "photo_text_changes": [
            {
                "photo_id": photo["id"],
                "action": "no_change",
                "priority": "medium",
                "caption": None,
                "description_blocks": None,
                "fact_check_notes": "",
                "sources": [],
            }
            for photo in metadata["photos"]
        ],
    }


def place_archive_prefix(selected: PlaceSearchResult, *, include_city: bool) -> str:
    place_slug = place_slug_for_path(selected.place)
    if not include_city:
        return place_slug
    city_slug = slugify(selected.city.name, fallback=selected.city.id)
    return f"{city_slug}/{place_slug}"


def build_collection_metadata(
    title: str,
    scope: str,
    selected_places: list[PlaceSearchResult],
    generated_at: datetime,
) -> dict[str, Any]:
    return {
        "schema_version": 2,
        "export": {
            "kind": "description_research_collection",
            "scope": scope,
            "title": title,
            "generated_at": datetime_value(generated_at),
            "contains_private_originals": False,
            "media_files_included": False,
        },
        "places": [
            {
                "directory": place_archive_prefix(selected, include_city=scope == "all"),
                "place_id": selected.place.id,
                "place_slug": selected.place.slug,
                "place_title": selected.place.title,
                "city_id": selected.city.id,
                "city_name": selected.city.name,
            }
            for selected in selected_places
        ],
    }


def write_place_research_files(
    archive: zipfile.ZipFile,
    metadata: dict[str, Any],
    *,
    prefix: str = "",
    include_prompt: bool,
) -> None:
    base = f"{prefix.rstrip('/')}/" if prefix else ""
    if prefix:
        archive.writestr(f"{base}README.md", build_place_folder_readme(metadata))
    else:
        archive.writestr("README.md", build_readme(metadata))
    if include_prompt:
        archive.writestr(f"{base}PROMPT.md", build_prompt(metadata))
        archive.writestr(f"{base}tts-guidelines.md", read_tts_guidelines())
    archive.writestr(f"{base}review.md", build_review(metadata))
    archive.writestr(
        f"{base}metadata.json",
        json.dumps(json_safe(metadata), indent=2, ensure_ascii=False) + "\n",
    )
    archive.writestr(
        f"{base}requested_changes.template.json",
        json.dumps(build_requested_changes_template(metadata), indent=2, ensure_ascii=False) + "\n",
    )


def write_chat_handoff_prompt(output_root: Path) -> Path:
    output_root.mkdir(parents=True, exist_ok=True)
    prompt_path = output_root / "prompt.txt"
    prompt_path.write_text(CHAT_HANDOFF_PROMPT + "\n", encoding="utf-8")
    return prompt_path


def place_archive_path(output_root: Path, place_slug: str) -> Path:
    archive_dir = output_root / EXPORT_SCOPE_DIRS["place"]
    archive_dir.mkdir(parents=True, exist_ok=True)
    return archive_dir / f"{place_slug}.zip"


def collection_archive_path(output_root: Path, scope: str, archive_slug: str) -> Path:
    if scope not in EXPORT_SCOPE_DIRS:
        raise ValueError(f"Unknown export scope: {scope}")
    archive_dir = output_root / EXPORT_SCOPE_DIRS[scope]
    archive_dir.mkdir(parents=True, exist_ok=True)
    return archive_dir / f"{archive_slug}.zip"


def export_place_research_archive(
    session: Session,
    selected: PlaceSearchResult,
    *,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    scope: str = "place",
    generated_at: datetime | None = None,
) -> Path:
    if scope != "place":
        raise ValueError("Single-place research archive scope must be place")
    generated_at = generated_at or datetime.now(UTC)
    photos = session.exec(
        select(Photo).where(Photo.place_id == selected.place.id).order_by(Photo.created_at, Photo.id)
    ).all()
    metadata = build_metadata(session, selected, photos, generated_at)
    archive_path = place_archive_path(output_root, place_slug_for_path(selected.place))
    write_chat_handoff_prompt(output_root)

    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        write_place_research_files(archive, metadata, include_prompt=True)

    return archive_path


def export_collection_research_archive(
    session: Session,
    selected_places: list[PlaceSearchResult],
    *,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    scope: str,
    title: str,
    archive_slug: str,
    generated_at: datetime | None = None,
) -> Path:
    if scope not in {"city", "all"}:
        raise ValueError("Collection research archive scope must be city or all")
    generated_at = generated_at or datetime.now(UTC)
    archive_path = collection_archive_path(output_root, scope, archive_slug)
    include_city = scope == "all"
    write_chat_handoff_prompt(output_root)

    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr("README.md", build_collection_readme(title, selected_places))
        archive.writestr("PROMPT.md", build_collection_prompt(title, selected_places))
        archive.writestr("tts-guidelines.md", read_tts_guidelines())
        archive.writestr(
            "metadata.json",
            json.dumps(
                json_safe(build_collection_metadata(title, scope, selected_places, generated_at)),
                indent=2,
                ensure_ascii=False,
            )
            + "\n",
        )
        for selected in selected_places:
            photos = session.exec(
                select(Photo).where(Photo.place_id == selected.place.id).order_by(Photo.created_at, Photo.id)
            ).all()
            metadata = build_metadata(session, selected, photos, generated_at)
            write_place_research_files(
                archive,
                metadata,
                prefix=place_archive_prefix(selected, include_city=include_city),
                include_prompt=False,
            )

    return archive_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export PhotoMap place descriptions into a text-only research ZIP.")
    parser.add_argument(
        "--scope",
        choices=["place", "city", "all"],
        default="place",
        help="Export scope: one place, one city, or all places. Default: place.",
    )
    parser.add_argument("--query", "-q", help="One-field search query for city or place.")
    parser.add_argument("--city", help="Optional city name filter for non-interactive use.")
    parser.add_argument("--place", help="Optional place name filter for non-interactive use.")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help="Root output directory. Default: research-exports/.",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Skip final confirmation for --scope all.",
    )
    return parser.parse_args()


def ensure_database_available() -> None:
    if DATABASE_URL.startswith("sqlite:///") and not DATABASE_PATH.exists():
        raise FileNotFoundError(f"PhotoMap database file does not exist: {DATABASE_PATH}")


def select_place_interactively(session: Session, args: argparse.Namespace) -> PlaceSearchResult | None:
    if args.city or args.place:
        results = search_place_results(session, city_query=args.city, place_query=args.place)
        return choose_result(results)

    query = args.query
    while True:
        if query is None:
            query = prompt_for_query()
            if query is None:
                return None
        results = search_place_results(session, query)
        selected = choose_result(results)
        if selected is not None:
            return selected
        query = None


def select_city_interactively(session: Session, args: argparse.Namespace) -> CitySearchResult | None:
    query = args.city or args.query
    while True:
        if query is None:
            query = prompt_for_city_query()
            if query is None:
                return None
        results = search_city_results(session, query)
        selected = choose_city_result(results)
        if selected is not None:
            return selected
        query = None


def print_archive_summary(paths: list[Path]) -> None:
    if len(paths) == 1:
        print(f"Utworzono paczkę research: {paths[0]}")
        return
    print(f"Utworzono paczki research: {len(paths)}")
    for path in paths:
        print(f"- {path}")


def main() -> int:
    args = parse_args()
    try:
        ensure_database_available()
        with Session(engine) as session:
            if args.scope == "all":
                selected_places = all_place_results(session)
                if not selected_places:
                    print("Brak miejsc do eksportu.")
                    return 1
                question = (
                    f"Zostanie utworzony tekstowy eksport opisów dla wszystkich miejsc "
                    f"({len(selected_places)} paczek). Kontynuować?"
                )
                if args.yes or confirm(question):
                    path = export_collection_research_archive(
                        session,
                        selected_places,
                        output_root=args.output_root,
                        scope="all",
                        title="Wszystkie miejsca",
                        archive_slug="wszystkie",
                    )
                    print_archive_summary([path])
                    return 0
                print("Eksport przerwany.")
                return 1

            if args.scope == "city":
                selected_city = select_city_interactively(session, args)
                if selected_city is None:
                    print("Eksport przerwany.")
                    return 1
                selected_places = place_results_for_city(session, selected_city.city)
                if not selected_places:
                    print(f"Miasto {selected_city.city.name} nie ma miejsc do eksportu.")
                    return 1
                city_slug = slugify(selected_city.city.name, fallback=selected_city.city.id)
                path = export_collection_research_archive(
                    session,
                    selected_places,
                    output_root=args.output_root,
                    scope="city",
                    title=selected_city.city.name,
                    archive_slug=city_slug,
                )
                print_archive_summary([path])
                return 0

            selected = select_place_interactively(session, args)
            if selected is None:
                print("Eksport przerwany.")
                return 1
            paths = [
                export_place_research_archive(
                    session,
                    selected,
                    output_root=args.output_root,
                    scope="place",
                )
            ]
            print_archive_summary(paths)
            return 0
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        print(f"Export failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
