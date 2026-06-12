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
  "category_ids": ["local_classic", "viewpoint"],
  "lat": 51.109,
  "lon": 17.032,
  "weight": 2.0,
  "status": "published",
  "cover_icon_path": "assets/place-icons/20_approved/rynek-wroclaw/place-rynek-wroclaw-icon-v01.png",
  "cover_caption": "Ikona miejsca"
}
```

`cover_icon_path` jest opcjonalne. Jeśli miejsce ma już `cover_photo_id`, importer nie doda kolejnej ikony, chyba że uruchomisz go z `--replace-covers`.

## Schemat przewodnika

```json
{
  "slug": "pierwszy-spacer",
  "title": "Pierwszy spacer",
  "description": "Krótka trasa startowa.",
  "status": "draft",
  "places": [
    { "slug": "rynek-wroclaw", "sort_order": 0 }
  ]
}
```
