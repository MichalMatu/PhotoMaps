# AGENTS.md - Content

## Purpose

`content` trzyma redakcyjne manifesty danych importowanych do PhotoMap. Wroclaw jest pierwszym miastem startowym i przykladem; kolejne miasta sa mozliwe pozniej, ale aktualnie przeplyw ma ograniczac reczna prace przy obecnym zakresie.

## Ownership

- `cities/{city}/manifest.json` trzyma definicje miasta, miejsc i tras/kolekcji.
- `cities/{city}/README.md` moze dokumentowac lokalne uwagi redakcyjne dla miasta.
- `README.md` opisuje ogolny workflow content pipeline.

## Local Contracts

- Manifest miasta jest roboczym zrodlem wiekszych zmian, a nie runtime storage; admin UI sluzy tylko do korekt, moderacji i pojedynczych zmian.
- Importer ma byc idempotentny po `city.id`, `place.slug` i `guide.slug`.
- Jeden realny obiekt albo jedna realna atrakcja ma miec jeden rekord `place`; przed dodaniem nowego miejsca sprawdz aktualny manifest, admina, aliasy, adres i wspolrzedne, a przy trafieniu aktualizuj istniejacy rekord zamiast tworzyc duplikat.
- Miejsca uzywaja `category_ids`; nie wracac do pojedynczej kategorii.
- Branzowe dane miejsca zapisuj w `custom_fields`; klucze i typy musza odpowiadac aktualnej konfiguracji produktu z `/api/app-config`.
- Trasy/kolekcje moga przypinac tylko miejsca ze statusem `published`, zgodnie z admin API.
- `guide.route_points` jest opcjonalna geometria linii trasy; `guide.places` nadal pozostaje lista przystankow.
- Przed wiekszym importem zrobic backup lokalnej bazy i storage.
- Manifesty nie powinny implementowac audio, platnosci, kont ani innych funkcji spoza aktualnego etapu.
- Manifesty nie importuja ikon ani ilustracyjnych coverow miejsc; covery mapy maja pochodzic z zatwierdzonych zdjec i pamiatek.

## Work Guidance

- Utrzymuj JSON czytelny redakcyjnie: stabilne slugi, sensowne opisy, jawne statusy, kategorie i skonfigurowane pola dodatkowe.
- Przy zmianie struktury manifestu zaktualizuj importer, testy oraz dokumentacje content pipeline.
- Nie dodawaj duzych partii miejsc przez panel admina, jesli mozna je opisac w manifestach.
- Zdjecia redakcyjne przygotowuj wedlug `docs/editorial-media-workflow.md`; manifest nie jest miejscem na pobieranie ani wersjonowanie plikow mediow.

## Verification

- `./scripts/backup_local_data.sh --apply` przed wiekszym lokalnym importem.
- `backend/.venv/bin/python scripts/content/import_city.py --dry-run content/cities/wroclaw/manifest.json`
- `backend/.venv/bin/python scripts/content/import_city.py --apply content/cities/wroclaw/manifest.json`
- `./scripts/check.sh` po zmianie struktury manifestu albo importera.

## Child Index

Brak lokalnych child docs.
