# AGENTS.md — Wrocław Bez Ściemy

## Cel projektu

Budujemy nową aplikację: lokalny przewodnik po Wrocławiu bez sieciówek, oparty o miejsca z charakterem, mapę, zdjęcia, pamiątki użytkowników i architekturę gotową pod późniejsze przewodniki, audio, historię oraz płatności.

To jest nowy produkt, nie dalszy rozwój WreckScanner.

Repozytorium WreckScanner może istnieć w folderze `_legacy/WreckScanner` tylko jako materiał referencyjny. Nie wolno modyfikować plików w `_legacy` bez wyraźnego polecenia użytkownika.

## Najważniejsza zasada domenowa

Głównym bytem systemu jest `place`.

Wszystko inne jest warstwą przypiętą do miejsca albo kolekcją miejsc:

```txt
place
 ├── category
 ├── photos
 ├── memories
 ├── guides
 ├── reports
 ├── audio_items          później
 ├── historical_items     później
 └── payments             później
```

Nie tworzyć osobnych światów dla zdjęć, pamiątek, audio, historii i przewodników.

## Zakazane słownictwo w nowym kodzie

Nie używać w nowym kodzie, API, UI, modelach, komponentach ani nazwach plików:

```txt
wreck
wrecks
vehicle
candidate
scan
YOLO
field_photo
report_package
savedWreck
```

Stare nazwy mogą występować tylko w folderze `_legacy/WreckScanner`.

## Podejście do WreckScanner

Nie robimy refaktoryzacji starego repo jako głównego projektu.

Budujemy czysty projekt od zera, ale można selektywnie przepisać małe, wartościowe fragmenty logiki z WreckScanner, szczególnie:

- upload zdjęć,
- tworzenie miniatur,
- usuwanie EXIF,
- prywatny oryginał + publiczna kopia,
- statusy moderacji `pending / approved / rejected`,
- prosta logika panelu admina.

Nie kopiować dużych plików 1:1. Jeśli logika jest potrzebna, przepisać ją do nowych modułów z nazwami domenowymi projektu.

## Stack technologiczny MVP

Backend:

- Python 3.11+
- FastAPI
- SQLModel albo SQLAlchemy 2.0
- SQLite na MVP
- Alembic na migracje
- Pillow do obrazów
- python-multipart do uploadu
- pytest do testów
- ruff do formatowania/lintingu

Frontend:

- React
- Vite
- TypeScript
- Leaflet / React-Leaflet
- zwykły CSS na start; Tailwind można dodać później

Storage MVP:

- lokalny folder `backend/storage/private` na oryginały,
- lokalny folder `backend/storage/public` na publiczne kopie i miniatury,
- publiczne API nigdy nie zwraca ścieżki do prywatnego oryginału.

Baza:

- SQLite: `backend/data/app.db`,
- modele projektować tak, żeby później łatwo przejść na PostgreSQL.

## Struktura katalogów

Docelowy układ:

```txt
.
├── AGENTS.md
├── README.md
├── .gitignore
├── _legacy/
│   └── WreckScanner/          # read-only reference
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   └── routes/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   └── media/
│   │   └── tests/
│   ├── data/
│   ├── storage/
│   │   ├── private/
│   │   └── public/
│   ├── alembic/
│   ├── alembic.ini
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   │   ├── map/
    │   │   ├── places/
    │   │   └── admin/
    │   ├── pages/
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

## Modele MVP

Na start wdrożyć tylko:

- `Category`,
- `Place`,
- `Photo`,
- `Memory`,
- `Guide`,
- `PlaceGuide`,
- `Report`.

Pola minimalne:

### Category

- `id`
- `label`
- `description`
- `icon`
- `sort_order`

### Place

- `id`
- `slug`
- `title`
- `description`
- `local_comment`
- `category_id`
- `lat`
- `lon`
- `weight`
- `status`: `draft | published | archived`
- `is_chain`
- `photo_count`
- `memory_count`
- `cover_photo_id`
- `created_at`
- `updated_at`

### Photo

- `id`
- `place_id`
- `original_path`
- `public_path`
- `thumb_path`
- `status`: `pending | approved | rejected`
- `caption`
- `created_at`
- `approved_at`

### Memory

- `id`
- `place_id`
- `author_name`
- `author_city`
- `caption`
- `original_path`
- `public_path`
- `thumb_path`
- `status`: `pending | approved | rejected`
- `paid`
- `share_slug`
- `created_at`
- `approved_at`

### Guide

- `id`
- `slug`
- `title`
- `description`
- `status`: `draft | published | archived`
- `created_at`
- `updated_at`

### Report

- `id`
- `target_type`
- `target_id`
- `reason`
- `message`
- `status`: `open | closed`
- `created_at`

## Endpointy MVP

Publiczne:

```txt
GET /health
GET /api/categories
GET /api/places
GET /api/places/{id_or_slug}
GET /api/places/{place_id}/photos
POST /api/places/{place_id}/photos
GET /api/places/{place_id}/memories
POST /api/places/{place_id}/memories
GET /api/guides
GET /api/guides/{slug}
POST /api/reports
```

Admin:

```txt
POST /api/admin/places
PATCH /api/admin/places/{place_id}
DELETE /api/admin/places/{place_id}
POST /api/admin/photos/{photo_id}/review
POST /api/admin/memories/{memory_id}/review
POST /api/admin/guides
PATCH /api/admin/guides/{guide_id}
POST /api/admin/guides/{guide_id}/places
DELETE /api/admin/guides/{guide_id}/places/{place_id}
GET /api/admin/reports
PATCH /api/admin/reports/{report_id}
```

Na MVP admin może być zabezpieczony prostym hasłem albo tokenem z `.env`. Nie budować jeszcze pełnego systemu kont.

## Kategorie startowe

Przy inicjalizacji bazy dodać:

```txt
bar_mleczny
street_food
coffee
viewpoint
mural
hidden_gem
cheap_food
date_spot
rainy_day
after_22
local_classic
```

## Ranking MVP

Ranking to helper, nie twarda logika rozsiana po aplikacji:

```txt
score = (photo_count + memory_count * 2) * weight
```

Nie wolno dodawać płatnego boosta miejsc.

W UI nie pokazywać technicznego słowa `weight`. Używać etykiet typu:

- polecane przez lokalsów,
- hidden gem,
- lokalny klasyk,
- popularne wśród odwiedzających,
- najwięcej wspomnień.

## Zasady zdjęć i prywatności

Dla wszystkich zdjęć i pamiątek:

- oryginał trafia do private storage,
- publiczna kopia jest pozbawiona EXIF,
- miniatura jest generowana osobno,
- domyślny status to `pending`,
- publicznie widoczne są tylko treści `approved`,
- publiczne API nie zwraca prywatnych ścieżek,
- admin może `approve` albo `reject`,
- po zatwierdzeniu aktualizować `photo_count` albo `memory_count`.

W formularzu uploadu dodać zgodę:

```txt
Potwierdzam, że jestem autorem zdjęcia albo mam prawo je opublikować. Jeśli na zdjęciu są rozpoznawalne osoby jako główny temat, mam ich zgodę.
```

## Czego nie implementować przed MVP

Nie wdrażać przed ukończeniem szkieletu:

- audio GPS,
- audio-wspomnień,
- płatności,
- kont użytkowników,
- paszportu/pieczątek,
- historii „kiedyś i dziś”,
- wielojęzyczności,
- zaawansowanego SEO,
- natywnej aplikacji mobilnej,
- rozbudowanych ról i uprawnień.

Można zostawić pola i architekturę gotową na przyszłość, ale nie implementować tych funkcji teraz.

## Kolejność pracy

Pracuj etapami. Nie przechodź dalej, jeśli aktualny etap nie działa.

```txt
0. Utworzenie struktury projektu
1. Backend FastAPI + SQLite
2. Modele Category i Place
3. Seed kategorii
4. API categories i places
5. Frontend Vite + React + Leaflet
6. Mapa renderująca places
7. Prosty admin CRUD miejsc
8. Upload zdjęć miejsca
9. Moderacja zdjęć
10. Memories: zdjęcie + podpis + autor
11. Moderacja memories
12. Ranking helper
13. Guides jako kolekcje miejsc
14. Reports jakości
```

## Testy po każdym etapie

Po każdej większej zmianie uruchomić:

Backend:

```bash
cd backend
pytest || true
python -m compileall app
```

Frontend:

```bash
cd frontend
npm run build
```

Dodatkowo sprawdzić ręcznie:

- `/health` odpowiada,
- `/api/categories` zwraca kategorie,
- `/api/places` zwraca tylko opublikowane miejsca w publicznym trybie,
- mapa się ładuje,
- admin może dodać miejsce,
- zdjęcie po uploadzie ma status `pending`,
- pending nie jest widoczne publicznie.

## Styl kodu

- Małe pliki zamiast jednego ogromnego pliku.
- Route'y API dzielić według domen: `places.py`, `categories.py`, `photos.py`, `memories.py`, `guides.py`, `reports.py`.
- Logikę przetwarzania zdjęć trzymać w `services/media`, nie w route'ach.
- Modele DB trzymać w `models`.
- Schematy request/response trzymać w `schemas`.
- Frontend dzielić na komponenty: mapa, miejsca, admin, upload, guides.
- Nie mieszać UI admina z publicznym UI, jeśli da się tego uniknąć.

## Definicja gotowego MVP

MVP jest gotowe, gdy:

- admin może dodać miejsce,
- miejsce ma kategorię,
- miejsce pojawia się na mapie,
- publiczna mapa pokazuje tylko `published`,
- miejsce ma opis i lokalny komentarz,
- można dodać zdjęcie do miejsca,
- zdjęcie trafia do moderacji,
- admin może zatwierdzić zdjęcie,
- publicznie widoczne są tylko zatwierdzone zdjęcia,
- można dodać pamiątkę `byłem tutaj`,
- pamiątka trafia do moderacji,
- miejsce ma licznik zdjęć i pamiątek,
- ranking korzysta z `photo_count`, `memory_count` i `weight`,
- istnieją proste guides jako kolekcje miejsc,
- UI nie zawiera słów związanych z WreckScanner.
