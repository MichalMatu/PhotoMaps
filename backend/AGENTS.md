# AGENTS.md - Backend

## Purpose

Backend odpowiada za FastAPI, SQLite/Alembic, modele domenowe, publiczne i adminowe API, storage plikow, przetwarzanie mediow oraz testy kontraktow API.

## Ownership

- `app/api` trzyma route'y publiczne i adminowe.
- `app/models` trzyma modele bazy i relacje.
- `app/schemas` trzyma request/response DTO.
- `app/serializers` mapuje modele na publiczne odpowiedzi.
- `app/services` trzyma logike domenowa i skutki uboczne.
- `app/services/media` trzyma obrobke obrazow i zapis kopii publicznych.
- `app/tests` trzyma testy w folderach `api`, `contracts`, `flows`, `importers`, `scripts`, `services` i `support`.
- `alembic` i `app/db` trzymaja migracje oraz inicjalizacje bazy.

## Local Contracts

- `place` jest centralnym bytem; zdjecia, pamiatki, techniczne guides/trasy i raporty sa przypiete do miejsca albo kolekcji miejsc.
- Kategorie miejsc sa relacja wiele-do-wielu przez `PlaceCategory`; nie wracac do pojedynczej kategorii na `Place`.
- Publiczne endpointy zwracaja tylko `published` miejsca oraz tylko zatwierdzone publiczne media.
- Publiczne odpowiedzi nigdy nie moga ujawnic `original_path` ani sciezek do prywatnego storage.
- Pipeline obrazow ma zachowywac rozdzielczosc i wysoka jakosc publicznej kopii; skalowanie jest dopuszczalne tylko dla osobnych miniaturek/preview, a limity bajtow i pikseli sa wysokimi bezpiecznikami, nie narzedziem obnizania jakosci.
- Publiczne i adminowe przeplywy API maja byc osobne, nawet jesli uzywaja tych samych modeli i serwisow.
- Route'y maja byc cienkie; walidacja domenowa, liczniki, review i usuwanie zaleznosci naleza do serwisow.
- Zmiana modelu wymaga migracji albo jawnej aktualizacji schematu oraz testu.
- Przy zmianie wewnetrznego kontraktu usunac stare pola, fallbacki i adaptery w tej samej zmianie.

## Work Guidance

- Dodawaj route'y wedlug domeny, np. `places.py`, `photos.py`, `memories.py`, `guides.py`, `reports.py`; produktowo guides oznaczaja trasy albo kolekcje miejsc.
- Dla nowych response'ow preferuj jawne schematy i serializery zamiast zwracania modeli ORM.
- Operacje na plikach mediow prowadz przez `services/media`; route nie powinien sam tworzyc miniaturek ani publicznych kopii.
- Aktualizacje `photo_count` i `memory_count` trzymaj przy review albo serwisie, ktory zmienia widocznosc publiczna.
- Importer i admin moga wspoldzielic serwisy, ale nie powinny wspoldzielic payloadow requestow.
- `app/tests/conftest.py` zostaje dla fixture'ow pytest; jawnie importowane helpery trzymaj w `app/tests/support`.

## Verification

- `cd backend && pytest`
- `cd backend && python -m compileall app`
- `./scripts/check.sh` po wiekszej zmianie kontraktu, migracji albo storage.

## Child Index

Brak lokalnych child docs. Dodaj tylko dla katalogu z wlasnym kontraktem, np. nowego storage backendu albo osobnego workflow migracji.
