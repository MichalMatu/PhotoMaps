# AGENTS.md - Content

## Purpose

`content` trzyma redakcyjne manifesty danych importowanych do aplikacji. To podstawowy przeplyw masowego dodawania miast i miejsc.

## Ownership

- `cities/{city}/manifest.json` trzyma definicje miasta, miejsc i przewodnikow.
- `cities/{city}/README.md` moze dokumentowac lokalne uwagi redakcyjne dla miasta.
- `README.md` opisuje ogolny workflow content pipeline.

## Local Contracts

- Manifest miasta jest roboczym zrodlem masowych zmian; admin UI sluzy tylko do korekt i pojedynczych zmian.
- Importer ma byc idempotentny po `city.id`, `place.slug` i `guide.slug`.
- Miejsca uzywaja `category_ids`; nie wracac do pojedynczej kategorii.
- Przed wiekszym importem zrobic backup lokalnej bazy i storage.
- Manifesty nie powinny implementowac audio, platnosci, kont ani innych funkcji spoza MVP.
- Assety ikon miejsc referencjonuj z `assets/place-icons`, nie kopiuj ich do manifestu jako dane binarne.

## Work Guidance

- Utrzymuj JSON czytelny redakcyjnie: stabilne slugi, sensowne opisy, jawne statusy i kategorie.
- Przy zmianie struktury manifestu zaktualizuj importer, testy oraz dokumentacje content pipeline.
- Nie dodawaj duzych partii miejsc przez panel admina, jesli mozna je opisac w manifestach.

## Verification

- `./scripts/backup_local_data.sh` przed wiekszym lokalnym importem.
- `backend/.venv/bin/python scripts/content/import_city.py content/cities/wroclaw/manifest.json`
- `./scripts/check.sh` po zmianie struktury manifestu albo importera.

## Child Index

Brak lokalnych child docs.
