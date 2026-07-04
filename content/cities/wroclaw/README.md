# Wrocław

Manifest Wroclawia trzymamy w `manifest.json`. Wroclaw jest pierwsza plansza startowa i datasetem do strojenia PhotoMap, nie marka calego produktu.

## Schemat miasta

```json
{
  "id": "wroclaw",
  "name": "Wrocław",
  "lat": 51.1079,
  "lon": 17.0385,
  "default_zoom": 13,
  "sort_order": 10,
  "status": "active"
}
```

## Schemat miejsca

```json
{
  "slug": "rynek-wroclaw",
  "title": "Rynek",
  "description": "Krótki opis miejsca.",
  "local_comment": "Krótki lokalny komentarz.",
  "article_blocks": [
    { "type": "heading", "text": "Duży tytuł pełnego opisu" },
    { "type": "subheading", "text": "Sekcja opisu" },
    {
      "type": "paragraph",
      "text": "Normalny akapit widoczny na stronie miejsca i czytany przez TTS."
    },
    { "type": "link", "text": "Materiał zewnętrzny", "url": "https://example.com/material" }
  ],
  "category_ids": ["local_classic", "viewpoint"],
  "lat": 51.109,
  "lon": 17.032,
  "weight": 2.0,
  "status": "published",
  "custom_fields": {
    "opening_hours": "10-18",
    "booking_url": "https://example.com/rezerwacja",
    "accessibility": "pełna"
  }
}
```

`custom_fields` jest opcjonalne. Dozwolone klucze i typy pochodza z aktualnej konfiguracji produktu pod `/api/app-config`; importer odrzuci nieznane pola, niepoprawne URL-e i wartosci spoza opcji `select`.

Manifest nie importuje ikon ani ilustracyjnych coverow miejsc. Media coverowe dodawaj przez adminowy pipeline zdjec i moderacji.

## Priorytet Redakcji

`weight` jest priorytetem redakcyjnym miejsca w skali `0.5-5.0`. Mapa uzywa go do rozmiaru kafla, kolejnosci widocznosci przy oddalaniu oraz filtra `Polecane`.

- `5.0` - wizytowka miasta widoczna jako pierwsza przy bardzo dalekim zoomie.
- `4.0-4.9` - najwazniejsze atrakcje turystyczne, ktore maja budowac pierwszy widok mapy.
- `3.0-3.9` - mocne miejsca miejskie widoczne przy zoomie miasta i centrum.
- `2.0-2.9` - miejsca drugiego planu, dobre po przyblizeniu.
- `0.5-1.9` - niski priorytet, rezerwowy dla szkicow albo miejsc bez pewnego materialu wizualnego.

Nie wyrownuj wag mechanicznie. Jesli dwa miejsca maja podobna liczbe zdjec, wyzszy priorytet powinno dostac miejsce bardziej rozpoznawalne dla turysty albo wazniejsze dla pierwszego wrazenia PhotoMap.

`article_blocks` jest opcjonalną listą pełnego opisu miejsca. Krótkie `description` i `local_comment` zostają do kart oraz list, a `article_blocks` trafia na publiczną stronę `/places/{slug}`, do admina i do TTS. Dozwolone typy bloków to `heading`, `subheading`, `paragraph` i `link`; puste teksty albo nieznane typy są odrzucane. Blok `link` musi mieć etykietę w `text` i adres `http/https` w `url`.

## Schemat przewodnika

`places` moze zawierac tylko slugi miejsc ze statusem `published`. Sama trasa moze byc `draft`, ale nie powinna przypinac szkicow ani archiwalnych miejsc.

```json
{
  "slug": "pierwszy-spacer",
  "title": "Pierwszy spacer",
  "description": "Krótka trasa startowa.",
  "status": "draft",
  "places": [{ "slug": "rynek-wroclaw", "sort_order": 0 }]
}
```
