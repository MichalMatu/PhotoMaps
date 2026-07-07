#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from sqlmodel import Session

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import models as _models  # noqa: E402,F401
from app.core.config import DATABASE_PATH, DATABASE_URL  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.models.city import City  # noqa: E402
from app.models.place import Place  # noqa: E402
from app.services.public_discovery import (  # noqa: E402
    active_cities_statement,
    public_discovery_places_statement,
)

DEFAULT_BASE_URL = "https://photomap.pl"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "research-exports" / "prompt.txt"

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
class FieldOption:
    key: str
    path: str
    description: str


@dataclass(frozen=True)
class AuditOption:
    key: str
    label: str
    instructions: tuple[str, ...]


@dataclass(frozen=True)
class PromptSelection:
    scope: str
    city: City
    place: Place | None = None


FIELD_OPTIONS = {
    "description": FieldOption("description", "description", "główny opis miejsca"),
    "article_blocks": FieldOption("article_blocks", "article_blocks[].text", "tekst artykułowy miejsca"),
    "photo_captions": FieldOption("photo_captions", "photos[].caption", "podpisy zdjęć"),
    "photo_blocks": FieldOption(
        "photo_blocks",
        "photos[].description_blocks[].text",
        "opisy zdjęć widoczne w galerii i czytane przez TTS",
    ),
}
FIELD_PRESETS = {
    "all": tuple(FIELD_OPTIONS),
    "place": ("description", "article_blocks"),
    "photos": ("photo_captions", "photo_blocks"),
    "tts": ("article_blocks", "photo_captions", "photo_blocks"),
}

AUDIT_OPTIONS = {
    "tts": AuditOption(
        "tts",
        "TTS i naturalność lektora",
        (
            "wyłapuj zdania, które brzmią sztucznie po przeczytaniu na głos",
            "upraszczaj karkołomne metafory, nie spłaszczając charakteru miejsca",
            "usuwaj dwuznaczności, które syntezator mowy może przeczytać nienaturalnie",
        ),
    ),
    "language": AuditOption(
        "language",
        "język, składnia i rytm",
        (
            "poprawiaj literówki, błędy składniowe, złą łączliwość i brakujące orzeczenia",
            "wskazuj powtórzenia, kalki, anglicyzmy i frazy zbyt potoczne dla opisu miejsca",
            "zachowuj konkretny sens obecnego tekstu zamiast pisać go od nowa",
        ),
    ),
    "ai": AuditOption(
        "ai",
        "czytelność dla agentów AI",
        (
            "preferuj jasne nazwy obiektów, miejsc i relacji zamiast niejasnych zaimków",
            "pilnuj, żeby agent mógł łatwo wyciągnąć listę miejsc, opisów, zdjęć i kontekstów",
            "nie zamieniaj opisów w streszczenia; poprawiaj tylko fragmenty, które utrudniają zrozumienie",
        ),
    ),
    "seo": AuditOption(
        "seo",
        "SEO bez marketingowego tonu",
        (
            "wzmacniaj czytelność nazw własnych i kontekstów miejsca, jeśli tekst jest zbyt mglisty",
            "unikaj sztucznego upychania fraz kluczowych",
            "nie dodawaj obietnic, rankingów ani języka reklamowego",
        ),
    ),
    "facts": AuditOption(
        "facts",
        "ostrożność faktograficzna",
        (
            "nie zmieniaj dat, nazwisk ani faktów historycznych bez wyraźnego powodu",
            "jeśli poprawka wymaga sprawdzenia źródeł, oznacz ją niższą pewnością zamiast zgadywać",
            "oddziel błąd językowy od możliwej wątpliwości faktograficznej",
        ),
    ),
}
AUDIT_PRESETS = {
    "full": ("tts", "language", "ai", "seo", "facts"),
    "quick": ("tts", "language", "ai"),
    "tts": ("tts", "language"),
    "seo": ("seo", "ai", "language"),
}
TTS_STANDARD_LINES = [
    "## Standard TTS PhotoMap",
    "- `photos[].caption` to krótki podpis zdjęcia, maksymalnie 120 znaków.",
    "- `photos[].description_blocks` to widoczny tekst galerii i jednocześnie materiał czytany przez TTS.",
    "- Dozwolone typy bloków opisu zdjęcia to `heading`, `subheading`, `paragraph` i `link`.",
    "- Linki są w TTS czytane przez etykietę `text`; nie proponuj czytania ani dopisywania URL-i w tekście lektora.",
    "- Dobry opis zdjęcia zaczyna od konkretnego widocznego elementu, miejsca, kontrastu albo pytania.",
    "- Pierwsze 2-3 bloki powinny działać samodzielnie dla osoby, która nie przeczyta całego opisu.",
    "- Pilnuj lokalnych konkretów: dat, osób, funkcji miejsca, detali architektury, wydarzeń i obserwacji terenowych.",
    "- Flaguj ogólniki typu `miejsce ma pamięć`, `kadr zaprasza do historii` albo podobne wypełniacze bez danych.",
    "- Przy wielu zdjęciach jednego miejsca wyłapuj powtórzone historie, legendy, puenty i pierwsze zdania.",
    "- Humor zostaw tylko tam, gdzie wyrasta z konkretnego detalu i nie dotyczy sacrum, przemocy, biedy ani tragedii.",
    "- Nie proponuj nowych typów bloków ani zmian struktury JSON poza tekstem do poprawy.",
]


def normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    translated = value.translate(POLISH_TRANSLATION)
    decomposed = unicodedata.normalize("NFKD", translated)
    ascii_text = "".join(char for char in decomposed if not unicodedata.combining(char))
    lowered = ascii_text.casefold()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", lowered)).strip()


def absolute_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def parse_token_list(
    value: str | None,
    *,
    default: tuple[str, ...],
    presets: dict[str, tuple[str, ...]],
    options: dict[str, object],
    label: str,
) -> tuple[str, ...]:
    if not value:
        return default
    selected: list[str] = []
    for raw_token in value.split(","):
        token = raw_token.strip().casefold()
        if not token:
            continue
        if token in presets:
            selected.extend(presets[token])
        elif token in options:
            selected.append(token)
        else:
            allowed = ", ".join(sorted((*presets.keys(), *options.keys())))
            raise ValueError(f"Unknown {label}: {token}. Allowed values: {allowed}")
    deduped = tuple(dict.fromkeys(selected))
    if not deduped:
        raise ValueError(f"No {label} selected.")
    return deduped


def all_public_cities(session: Session) -> list[City]:
    return list(session.exec(active_cities_statement()).all())


def public_places_for_city(session: Session, city: City) -> list[Place]:
    return list(session.exec(public_discovery_places_statement(city.id)).all())


def city_has_public_places(session: Session, city: City) -> bool:
    return bool(public_places_for_city(session, city))


def public_cities_with_places(session: Session) -> list[City]:
    return [city for city in all_public_cities(session) if city_has_public_places(session, city)]


def matches_query(query: str, *values: str | None) -> bool:
    normalized_query = normalize_text(query)
    if not normalized_query:
        return True
    return any(normalized_query in normalize_text(value) for value in values)


def select_city_by_query(session: Session, query: str, *, require_places: bool) -> City | None:
    cities = public_cities_with_places(session) if require_places else all_public_cities(session)
    matches = [city for city in cities if matches_query(query, city.id, city.name, city.region)]
    if len(matches) == 1:
        return matches[0]
    exact = [city for city in matches if normalize_text(query) in {normalize_text(city.id), normalize_text(city.name)}]
    if len(exact) == 1:
        return exact[0]
    return None


def select_place_by_query(session: Session, city: City, query: str) -> Place | None:
    places = public_places_for_city(session, city)
    matches = [place for place in places if matches_query(query, place.slug, place.title)]
    if len(matches) == 1:
        return matches[0]
    exact = [
        place for place in matches if normalize_text(query) in {normalize_text(place.slug), normalize_text(place.title)}
    ]
    if len(exact) == 1:
        return exact[0]
    return None


def prompt_choice(prompt: str, *, choices: set[str]) -> str | None:
    while True:
        value = input(prompt).strip()
        if value.casefold() in {"q", "quit", "exit"}:
            return None
        if value in choices:
            return value
        print("Podaj numer z listy albo q.")


def choose_city_interactively(session: Session, *, require_places: bool) -> City | None:
    cities = public_cities_with_places(session) if require_places else all_public_cities(session)
    if not cities:
        print("Brak aktywnych miast z publicznymi miejscami." if require_places else "Brak aktywnych miast.")
        return None
    print("\nMiasto:")
    for index, city in enumerate(cities, start=1):
        places_count = len(public_places_for_city(session, city))
        print(f"{index:2}. {city.name} ({city.id}, miejsca publiczne: {places_count})")
    choice = prompt_choice(
        "Wybierz numer miasta albo q: ",
        choices={str(index) for index in range(1, len(cities) + 1)},
    )
    if choice is None:
        return None
    return cities[int(choice) - 1]


def choose_place_interactively(session: Session, city: City) -> Place | None:
    places = public_places_for_city(session, city)
    if not places:
        print(f"Miasto {city.name} nie ma publicznych miejsc.")
        return None
    print(f"\nMiejsce w mieście {city.name}:")
    for index, place in enumerate(places, start=1):
        print(f"{index:2}. {place.title} ({place.slug})")
    choice = prompt_choice(
        "Wybierz numer miejsca albo q: ",
        choices={str(index) for index in range(1, len(places) + 1)},
    )
    if choice is None:
        return None
    return places[int(choice) - 1]


def choose_scope_interactively() -> str | None:
    print("\nZakres:")
    print(" 1. Jedno miejsce")
    print(" 2. Całe miasto")
    choice = prompt_choice("Wybierz zakres albo q: ", choices={"1", "2"})
    if choice is None:
        return None
    return "place" if choice == "1" else "city"


def choose_preset_interactively(
    title: str,
    presets: dict[str, tuple[str, ...]],
    *,
    default: str,
) -> str | None:
    keys = list(presets.keys())
    print(f"\n{title}:")
    for index, key in enumerate(keys, start=1):
        suffix = " (domyślnie)" if key == default else ""
        print(f"{index:2}. {key}{suffix}")
    choice = input("Wybierz numer, wpisz własną listę po przecinku albo Enter dla domyślnej: ").strip()
    if choice.casefold() in {"q", "quit", "exit"}:
        return None
    if not choice:
        return default
    if choice.isdigit() and 1 <= int(choice) <= len(keys):
        return keys[int(choice) - 1]
    return choice


def select_prompt_target(session: Session, args: argparse.Namespace) -> PromptSelection | None:
    interactive = sys.stdin.isatty()
    scope = args.scope
    if scope is None:
        if args.place:
            scope = "place"
        elif args.city and not interactive:
            scope = "city"
        else:
            scope = choose_scope_interactively()
    if scope is None:
        return None

    city = select_city_by_query(session, args.city, require_places=True) if args.city else None
    if args.city and city is None and not interactive:
        raise ValueError(f"No unique active city with public places matched --city {args.city!r}.")
    if city is None:
        if not interactive:
            raise ValueError("Missing --city for non-interactive prompt generation.")
        city = choose_city_interactively(session, require_places=True)
    if city is None:
        return None

    if scope == "city":
        return PromptSelection(scope=scope, city=city)

    place = select_place_by_query(session, city, args.place) if args.place else None
    if args.place and place is None and not interactive:
        raise ValueError(f"No unique public place in {city.name} matched --place {args.place!r}.")
    if place is None:
        if not interactive:
            raise ValueError("Missing --place for non-interactive place prompt generation.")
        place = choose_place_interactively(session, city)
    if place is None:
        return None
    return PromptSelection(scope=scope, city=city, place=place)


def field_lines(field_keys: tuple[str, ...]) -> list[str]:
    return [f"- `{FIELD_OPTIONS[key].path}` - {FIELD_OPTIONS[key].description}" for key in field_keys]


def audit_lines(audit_keys: tuple[str, ...]) -> list[str]:
    lines: list[str] = []
    for key in audit_keys:
        option = AUDIT_OPTIONS[key]
        lines.append(f"### {option.label}")
        lines.extend(f"- {instruction}" for instruction in option.instructions)
        lines.append("")
    return lines


def should_include_tts_standard(field_keys: tuple[str, ...], audit_keys: tuple[str, ...]) -> bool:
    return "tts" in audit_keys or "photo_blocks" in field_keys or "photo_captions" in field_keys


def tts_standard_lines(field_keys: tuple[str, ...], audit_keys: tuple[str, ...]) -> list[str]:
    if not should_include_tts_standard(field_keys, audit_keys):
        return []
    return [*TTS_STANDARD_LINES, ""]


def build_prompt(
    selection: PromptSelection,
    *,
    field_keys: tuple[str, ...],
    audit_keys: tuple[str, ...],
    base_url: str = DEFAULT_BASE_URL,
) -> str:
    llms_url = absolute_url(base_url, "/llms.txt")
    city_places_url = absolute_url(base_url, f"/api/public/cities/{selection.city.id}/places")
    lines = [
        "# Audyt opisów PhotoMap przez publiczne API",
        "",
        "Jesteś redaktorem PhotoMap. Pracujesz wyłącznie na publicznych endpointach JSON, nie na interaktywnej mapie.",
        "",
        "## Wejście",
        f"1. Otwórz `{llms_url}` i przeczytaj publiczny kontrakt danych.",
    ]

    if selection.scope == "place":
        if selection.place is None:
            raise ValueError("Place scope requires selected place.")
        place_url = absolute_url(
            base_url,
            f"/api/public/cities/{selection.city.id}/places/{selection.place.slug}",
        )
        lines.extend(
            [
                f"2. Pobierz endpoint miejsca: `{place_url}`.",
                f"3. Audytuj tylko miejsce: `{selection.place.slug}` - {selection.place.title}, {selection.city.name}.",
            ]
        )
    else:
        lines.extend(
            [
                f"2. Pobierz listę miejsc miasta: `{city_places_url}`.",
                "3. Dla każdego elementu z listy pobierz szczegółowy JSON przez pole `api_path`.",
                f"4. Jeśli `api_path` jest relatywne, połącz je z `{base_url.rstrip('/')}`.",
                f"5. Audytuj wszystkie miejsca zwrócone dla miasta {selection.city.name}.",
            ]
        )

    lines.extend(
        [
            "",
            "## Pola Do Sprawdzenia",
            *field_lines(field_keys),
            "",
            "## Tryb Audytu",
            *audit_lines(audit_keys),
            *tts_standard_lines(field_keys, audit_keys),
            "## Zasady Poprawek",
            "- Nie przepisuj całych opisów, jeśli wystarczy krótka korekta fragmentu.",
            "- Nie skracaj tekstu mechanicznie i nie usuwaj klimatu miejsca bez powodu.",
            "- Nie dodawaj nowych faktów, dat, nazwisk ani źródeł, jeśli nie wynikają z danych endpointu.",
            "- `stary tekst` ma być dokładnym fragmentem istniejącym w JSON, "
            "możliwym do znalezienia przez wyszukiwanie.",
            "- W `stary tekst` nie używaj wielokropków, skrótów, parafrazy ani tekstu złożonego "
            "z kilku nieciągłych miejsc.",
            "- Jeśli poprawka dotyczy kilku osobnych fragmentów, rozbij ją na kilka wierszy.",
            "- `nowy tekst` ma być gotową zamianą tego fragmentu, bez komentarzy w środku.",
            "- Jeśli poprawka dotyczy całego zdania, podaj całe stare zdanie i całe nowe zdanie.",
            "- Jeśli ten sam `stary tekst` występuje kilka razy, wskaż dokładny indeks pola w kolumnie `gdzie`.",
            "- Jeśli propozycja wymaga fact-checkingu poza endpointem, ustaw niższą pewność i opisz to w powodzie.",
            "- Nie zgłaszaj prywatnych ścieżek storage, plików oryginalnych ani zmian zdjęć. "
            "Ten audyt dotyczy tylko tekstu.",
            "",
            "## Format Odpowiedzi",
            "Zwróć wyłącznie tabelę Markdown:",
            "",
            "| miejsce | gdzie | stary tekst | nowy tekst | powód | pewność |",
            "| --- | --- | --- | --- | --- | --- |",
            "",
            "W kolumnie `gdzie` używaj możliwie precyzyjnych ścieżek, np.:",
            "- `description`",
            "- `article_blocks[3].text`",
            "- `photos[12].caption`",
            "- `photos[12].description_blocks[4].text`",
            "",
            "W kolumnie `pewność` używaj tylko: `wysoka`, `średnia`, `niska`.",
            "Jeśli nie znajdujesz problemów, zwróć jedną tabelę z wierszem `brak zmian`.",
        ]
    )
    return "\n".join(lines).rstrip() + "\n"


def write_prompt(prompt: str, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(prompt, encoding="utf-8")
    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a PhotoMap web-chat audit prompt from public DB records.")
    parser.add_argument(
        "--scope",
        choices=["place", "city"],
        help="Audit one place or every public place in a city.",
    )
    parser.add_argument("--city", help="City id or name. If omitted, the script shows a numbered list.")
    parser.add_argument(
        "--place",
        help="Place slug or title. Implies --scope place when --scope is omitted.",
    )
    parser.add_argument(
        "--fields",
        help=(
            "Comma-separated fields or preset. Presets: all, place, photos, tts. "
            "Fields: description, article_blocks, photo_captions, photo_blocks."
        ),
    )
    parser.add_argument(
        "--audit",
        help=(
            "Comma-separated audit modes or preset. Presets: full, quick, tts, seo. "
            "Modes: tts, language, ai, seo, facts."
        ),
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help="Public site base URL. Default: https://photomap.pl",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Where to save the prompt. Default: research-exports/prompt.txt",
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Print the prompt without writing it to disk.",
    )
    return parser.parse_args()


def ensure_database_available() -> None:
    if DATABASE_URL.startswith("sqlite:///") and not DATABASE_PATH.exists():
        raise FileNotFoundError(f"PhotoMap database file does not exist: {DATABASE_PATH}")


def main() -> int:
    args = parse_args()
    try:
        ensure_database_available()
        fields_input = args.fields
        audit_input = args.audit
        if fields_input is None and sys.stdin.isatty():
            fields_input = choose_preset_interactively("Pola", FIELD_PRESETS, default="all")
            if fields_input is None:
                print("Generator przerwany.")
                return 1
        if audit_input is None and sys.stdin.isatty():
            audit_input = choose_preset_interactively("Audyt", AUDIT_PRESETS, default="quick")
            if audit_input is None:
                print("Generator przerwany.")
                return 1

        field_keys = parse_token_list(
            fields_input,
            default=FIELD_PRESETS["all"],
            presets=FIELD_PRESETS,
            options=FIELD_OPTIONS,
            label="fields",
        )
        audit_keys = parse_token_list(
            audit_input,
            default=AUDIT_PRESETS["quick"],
            presets=AUDIT_PRESETS,
            options=AUDIT_OPTIONS,
            label="audit modes",
        )

        with Session(engine) as session:
            selection = select_prompt_target(session, args)
            if selection is None:
                print("Generator przerwany.")
                return 1
            prompt = build_prompt(
                selection,
                field_keys=field_keys,
                audit_keys=audit_keys,
                base_url=args.base_url,
            )

        if not args.no_write:
            path = write_prompt(prompt, args.output)
            print(f"Zapisano prompt: {path}")
        print("")
        print(prompt)
        return 0
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        print(f"Prompt generation failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
