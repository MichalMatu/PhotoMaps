# AGENTS.md - Content Scripts

## Purpose

`scripts/content` trzyma narzedzia importu redakcyjnych manifestow danych do PhotoMap.

## Ownership

- `import_city.py` waliduje manifest miasta, tworzy lub aktualizuje miasto, miejsca, kategorie miejsc i techniczne guides jako trasy/kolekcje.

## Local Contracts

- Importer ma byc idempotentny: ponowne uruchomienie na tym samym manifiescie aktualizuje istniejace rekordy zamiast tworzyc duplikaty.
- Klucze stabilnosci to `city.id`, `place.slug` i `guide.slug`; `city.region` jest wymaganym kontekstem wojewodztwa dla selektora miast.
- Importer musi walidowac aktywne `category_ids` przed zapisem miejsc.
- Importer musi walidowac `place.custom_fields` wedlug aktualnych definicji konfiguracji produktu z `/api/app-config`.
- Importer musi odrzucac przypiecia tras/kolekcji do miejsc innych niz `published`.
- Importer waliduje `guide.kind` jako `route` albo `collection`; tylko trasy moga zapisac opcjonalne `guide.route_points`, a przystanki/miejsca nadal wynikaja z `guide.places`.
- Importer nie obsluguje ikon ani ilustracyjnych coverow miejsc; media coverowe przechodza przez adminowy pipeline zdjec i moderacji.
- Nie dodawac pobierania danych z internetu, generowania obrazow, platnosci, audio ani innych modulow spoza aktualnego zakresu mapy.
- Przy zmianie formatu manifestu zaktualizowac testy i dokumentacje w `content`.

## Work Guidance

- Walidacje trzymaj jawne i blisko parsowania manifestu; komunikaty bledow maja wskazywac sciezke pola.
- Side effects zapisuj przez istniejace modele i serwisy backendu, bez omijania regul storage albo statusow.
- Nie dodawaj kompatybilnosci dla starego ksztaltu manifestu, chyba ze uzytkownik jawnie poprosi o okres przejsciowy.

## Verification

- `cd backend && pytest app/tests/test_content_import.py`
- `backend/.venv/bin/python scripts/content/import_city.py --dry-run content/cities/wroclaw/manifest.json`
- `backend/.venv/bin/python scripts/content/import_city.py --apply content/cities/wroclaw/manifest.json`
- `./scripts/check.sh` po zmianie kontraktu manifestu.

## Child Index

Brak lokalnych child docs.
