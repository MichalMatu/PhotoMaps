# Content Pipeline

Content pipeline sluzy do powtarzalnego utrzymania danych PhotoMap. Wroclaw jest pierwszym przykladem i miastem startowym; ten sam mechanizm moze obsluzyc kolejne miasta pozniej, ale aktualnie ma przede wszystkim ograniczac reczne klikanie i utrzymac porzadek w danych.

Admin UI sluzy do korekt, moderacji i pojedynczych zmian. Wieksze partie danych powinny isc przez manifesty i importer.

Pozyskiwanie, selekcja, deduplikacja i upload wysokiej jakosci zdjec redakcyjnych sa opisane w [`docs/editorial-media-workflow.md`](editorial-media-workflow.md). Manifest miasta tworzy i aktualizuje miasto, miejsca oraz trasy/kolekcje; zdjecia pozostaja osobnym adminowym przeplywem mediow.

## Manifesty

Manifest miasta trzymamy w:

```txt
content/cities/{city}/manifest.json
```

Manifest jest roboczym zrodlem wiekszych zmian. Zawiera definicje miasta, miejsca i proste trasy/kolekcje miejsc. Miejsca uzywaja `category_ids`, bo jedno miejsce moze nalezec do kilku kategorii. Dlugie redakcyjne opisy miejsc i tras trafiaja do `article_blocks`, a branzowe dane miejsca, ktore nie sa rdzeniem mapy, trafiaja do `custom_fields`.

Jeden realny obiekt albo jedna realna atrakcja ma miec jeden rekord `place`. Przed dopisaniem nowego miejsca sprawdz aktualny manifest, adminowa liste miejsc, aliasy nazwy, adres i wspolrzedne. Jesli obiekt juz istnieje, aktualizuj istniejacy `place` zamiast tworzyc duplikat pod innym slugiem.

Trasy moga miec opcjonalne `route_points`: liste punktow `{ "lat": ..., "lon": ... }`, ktora opisuje przebieg linii na mapie trasy. `places` nadal okresla przystanki i karty miejsc na trasie. Jesli `route_points` nie ma, frontend laczy przystanki prosta linia. Link do Google Maps i tak wylicza prawdziwa trase piesza po stronie Google, wiec `route_points` jest redakcyjnym ulepszeniem lokalnej mapki, nie silnikiem nawigacji.

Wroclaw jako przyklad:

```bash
backend/.venv/bin/python scripts/content/import_city.py --dry-run content/cities/wroclaw/manifest.json
backend/.venv/bin/python scripts/content/import_city.py --apply content/cities/wroclaw/manifest.json
```

## Import

Przed wiekszym importem zawsze zrob backup lokalnej bazy i storage:

```bash
./scripts/backup_local_data.sh --dry-run
./scripts/backup_local_data.sh --apply
```

Backup uruchamia najpierw `scripts/diagnose_local_data.py` i blokuje kopiowanie, jesli lokalna baza albo storage maja bledy. Raport diagnostyczny jest zapisywany w katalogu backupu. Szczegoly sa w [`docs/ops.md`](ops.md).

Importer jest idempotentny po stabilnych kluczach:

- `city.id`,
- `place.slug`,
- `guide.slug`.

Ponowne uruchomienie na tym samym manifiescie ma aktualizowac istniejace rekordy zamiast tworzyc duplikaty.

## Co Importer Robi

- Tworzy albo aktualizuje miasto po `city.id`.
- Tworzy albo aktualizuje miejsca po `place.slug`.
- Waliduje aktywne kategorie z `category_ids`.
- Przypina wiele kategorii do miejsca.
- Waliduje i zapisuje `place.article_blocks` oraz `guide.article_blocks` jako pelne opisy dla stron szczegolow i TTS.
- Waliduje i zapisuje `place.custom_fields` wedlug aktualnej konfiguracji produktu, tej samej ktora jest widoczna publicznie pod `/api/app-config` i edytowana w adminowej sekcji `Konfiguracja`.
- Tworzy albo aktualizuje trasy/kolekcje po technicznym `guide.slug`.
- Odbudowuje przypisania miejsc do tras/kolekcji.
- Waliduje, ze trasy/kolekcje przypinaja tylko miejsca ze statusem `published`.
- Waliduje i zapisuje opcjonalne `guide.route_points` jako przebieg linii mapy trasy.

Manifest nie importuje coverow ani ikon miejsc. Media widoczne jako covery mapy przechodza przez adminowy pipeline zdjec, prywatnego oryginalu, publicznej kopii i moderacji. Publiczna kopia zdjecia zachowuje rozdzielczosc wejscia po bezpiecznym przetworzeniu i nie jest sztucznie downsizowana; tylko osobna miniatura jest skalowana do lekkich widokow mapy i list. Limity bajtow i pikseli w pipeline sa wysokimi bezpiecznikami przed uszkodzonym albo ekstremalnym inputem, a nie limitem jakosci materialow redakcyjnych.

## Workflow Mediow I Danych Roboczych

Miejsca, kategorie, opisy i proste trasy importuj przez manifest. Pamiatki uzytkownikow oraz redakcyjne zdjecia z audio sa dalej przeplywem admina i moderacji, bo wymagaja prywatnego oryginalu, publicznej kopii, statusu widocznosci oraz ewentualnej anonimizacji.

Przed czyszczeniem lokalnej dummy data albo wieksza sesja realnego contentu wykonaj backup, uruchom diagnostyke i dopiero potem reset/import. Nie kasuj recznie pojedynczych plikow storage bez odpowiadajacych rekordow w bazie; po takim sprzataniu `scripts/diagnose_local_data.py` powinien przejsc bez bledow.

## Pola Dodatkowe Miejsca

`article_blocks` jest opcjonalną listą bloków pełnego opisu miejsca albo trasy. Publiczna lista miejsc i mapa jej nie pobierają; pełny tekst miejsca jest zwracany przez szczegół miejsca, admin API i formularz miejsca. Trasy/kolekcje mogą używać tego samego pola dla pełnego opisu, obok krótkiego `description` używanego w kartach.

Dozwolone typy:

- `heading` - duży tytuł sekcji artykułu,
- `subheading` - średni podtytuł,
- `paragraph` - normalny tekst,
- `link` - osobny odnośnik z etykietą w `text` i adresem w `url`.

Blok `link` wymaga adresu `http` albo `https`. Pole `url` jest dozwolone tylko dla typu `link`, dzięki czemu linki nie trafiają przypadkiem do dużych nagłówków ani akapitów.

Przyklad:

```json
{
  "slug": "miejsce",
  "title": "Miejsce",
  "category_ids": ["local_classic"],
  "lat": 52.0,
  "lon": 19.0,
  "article_blocks": [
    { "type": "heading", "text": "Duży tytuł" },
    { "type": "subheading", "text": "Sekcja" },
    { "type": "paragraph", "text": "Normalny akapit pełnego opisu." },
    { "type": "link", "text": "Materiał zewnętrzny", "url": "https://example.com/material" }
  ]
}
```

`custom_fields` jest opcjonalnym obiektem przy miejscu. Klucze musza istniec w `place_custom_fields` aktualnej konfiguracji produktu. Importer odrzuci nieznane klucze, zly typ wartosci, niepoprawny URL albo wartosc spoza opcji pola `select`.

Przyklad:

```json
{
  "slug": "miejsce",
  "title": "Miejsce",
  "category_ids": ["local_classic"],
  "lat": 52.0,
  "lon": 19.0,
  "custom_fields": {
    "opening_hours": "10-18",
    "booking_url": "https://example.com/rezerwacja",
    "accessibility": "pełna"
  }
}
```

Publiczne API pokazuje tylko pola oznaczone w konfiguracji jako `public`. Admin API i formularz miejsca pokazuja pelny zestaw skonfigurowanych pol.

## Media Coverowe

Nie tworz generowanych ikon ani ilustracyjnych coverow miejsc. Pierwszy widok mapy ma byc budowany z zatwierdzonych zdjec i pamiatek, ktore przechodza przez storage, miniatury i publiczne serializery.

## Czego Importer Nie Robi

- Nie pobiera danych z internetu.
- Nie generuje obrazow.
- Nie tworzy pamiatek.
- Nie importuje audio.
- Nie obsluguje platnosci.
- Nie rozbudowuje kont ani uprawnien.
- Nie jest miejscem na nowe moduly spoza aktualnego zakresu mapy.

## Weryfikacja

Po imporcie sprawdz publiczna mape i admin. Po zmianie formatu manifestu zaktualizuj importer, testy oraz lokalne instrukcje w `content/AGENTS.md` i `scripts/content/AGENTS.md`.
