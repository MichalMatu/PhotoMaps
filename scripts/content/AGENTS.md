# AGENTS.md - Content Scripts

## Purpose

`scripts/content` trzyma narzedzia masowego importu redakcyjnych manifestow do lokalnej aplikacji.

## Ownership

- `import_city.py` waliduje manifest miasta, tworzy lub aktualizuje miasto, miejsca, kategorie miejsc, ikony i przewodniki.

## Local Contracts

- Importer ma byc idempotentny: ponowne uruchomienie na tym samym manifiescie aktualizuje istniejace rekordy zamiast tworzyc duplikaty.
- Klucze stabilnosci to `city.id`, `place.slug` i `guide.slug`.
- Importer musi walidowac aktywne `category_ids` przed zapisem miejsc.
- Import ikon ma korzystac ze wspolnego pipeline'u mediow, z publiczna kopia i miniatura.
- Nie dodawac pobierania danych z internetu, generowania obrazow, platnosci ani audio do importera MVP.
- Przy zmianie formatu manifestu zaktualizowac testy i dokumentacje w `content`.

## Work Guidance

- Walidacje trzymaj jawne i blisko parsowania manifestu; komunikaty bledow maja wskazywac sciezke pola.
- Side effects zapisuj przez istniejace modele i serwisy backendu, bez omijania regul storage albo statusow.
- Nie dodawaj kompatybilnosci dla starego ksztaltu manifestu, chyba ze uzytkownik jawnie poprosi o okres przejsciowy.

## Verification

- `cd backend && pytest app/tests/test_content_import.py`
- `backend/.venv/bin/python scripts/content/import_city.py content/cities/wroclaw/manifest.json`
- `./scripts/check.sh` po zmianie kontraktu manifestu.

## Child Index

Brak lokalnych child docs.
