# Content Pipeline

Content pipeline sluzy do powtarzalnego utrzymania danych PhotoMap. Wroclaw jest pierwszym przykladem i miastem startowym; ten sam mechanizm moze obsluzyc kolejne miasta pozniej, ale aktualnie ma przede wszystkim ograniczac reczne klikanie i utrzymac porzadek w danych.

Admin UI sluzy do korekt, moderacji i pojedynczych zmian. Wieksze partie danych powinny isc przez manifesty i importer.

## Manifesty

Manifest miasta trzymamy w:

```txt
content/cities/{city}/manifest.json
```

Manifest jest roboczym zrodlem wiekszych zmian. Zawiera definicje miasta, miejsca i proste trasy/kolekcje miejsc. Miejsca uzywaja `category_ids`, bo jedno miejsce moze nalezec do kilku kategorii.

Wroclaw jako przyklad:

```bash
backend/.venv/bin/python scripts/content/import_city.py content/cities/wroclaw/manifest.json
```

## Import

Przed wiekszym importem zawsze zrob backup lokalnej bazy i storage:

```bash
./scripts/backup_local_data.sh
```

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
- Tworzy albo aktualizuje trasy/kolekcje po technicznym `guide.slug`.
- Odbudowuje przypisania miejsc do tras/kolekcji.
- Importuje `cover_icon_path` jako zatwierdzony `map_icon`, jesli ma to sens dla covera.

`cover_icon_path` jest opcjonalne. Assety ikon/coverow sa ulepszeniem jakosciowym i nie blokuja importu. Jesli dobre zwykle zdjecie lepiej pokazuje miejsce, moze byc coverem.

Flaga `--replace-covers` powinna byc uzywana swiadomie: wymienia covery zamiast tylko uzupelniac brakujace.

## Assety

Redakcyjne ikony miejsc trzymamy w:

```txt
assets/place-icons
```

Finalne ikony powinny wspierac mape miniaturek, nie zastepowac danych miejsca. Nie generuj fikcyjnych detali udajacych dokumentalne zdjecia miejsca.

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
