# Content Pipeline

Docelowo nie chcemy ręcznie klikać tysięcy miejsc w panelu admina. Panel admina służy do korekt i moderacji, a masowe dodawanie miast powinno iść przez manifesty oraz importer.

## Przepływ pracy

1. Przygotuj albo uzupełnij manifest miasta:

```txt
content/cities/{city}/manifest.json
```

Manifest zawiera definicję miasta, listę miejsc i przewodniki. Miejsca używają `category_ids`, bo jedno miejsce może należeć do kilku kategorii.

2. Wygeneruj albo wybierz ikony miejsc według promptu:

```txt
docs/image_generation/place-thumbnails.md
```

3. Uporządkuj ikony:

```txt
assets/place-icons/00_inbox
assets/place-icons/10_candidates
assets/place-icons/20_approved
assets/place-icons/90_archive
```

4. Zrób backup lokalnej bazy i storage:

```bash
./scripts/backup_local_data.sh
```

5. Uruchom import:

```bash
backend/.venv/bin/python scripts/content/import_city.py content/cities/wroclaw/manifest.json
```

6. Sprawdź mapę i panel admina. Poprawki redakcyjne można robić w adminie albo wrócić do manifestu i zaimportować ponownie.

## Co importer robi teraz

- tworzy lub aktualizuje miejsca po `slug`,
- tworzy lub aktualizuje miasto po `city.id`,
- waliduje aktywne kategorie z `category_ids`,
- importuje ikonę jako zatwierdzony `map_icon`, jeśli miejsce nie ma jeszcze covera,
- zachowuje PNG i przezroczystość dzięki wspólnemu pipeline'owi obrazów,
- tworzy lub aktualizuje przewodniki po `slug`,
- odbudowuje przypisania miejsc do przewodników.

## Czego importer jeszcze nie robi

- nie pobiera danych z internetu,
- nie generuje obrazów,
- nie tworzy pamiątek,
- nie importuje audio,
- nie obsługuje płatności,
- nie rozwiązuje konfliktów redakcyjnych między adminem a manifestem.

## Zasada bezpieczeństwa

Przed większym importem zawsze zrobić backup lokalnej bazy i storage. Pliki backupów trafiają do `backups/`, które jest ignorowane przez git.
