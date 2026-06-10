# Wroclaw Bez Sciemy

Nowy projekt lokalnego przewodnika po Wroclawiu opartego o miejsca z charakterem. Glownym bytem systemu jest `place`; folder `_legacy/WreckScanner` jest tylko lokalna referencja i nie wchodzi do repo.

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend startuje domyslnie pod `http://127.0.0.1:8000`.

Podstawowe endpointy:

```txt
GET /health
GET /api/categories
GET /api/places
GET /api/places/map
GET /api/places/{id_or_slug}
GET /api/places/{place_id}/photos
POST /api/places/{place_id}/photos
GET /api/places/{place_id}/memories
POST /api/places/{place_id}/memories
GET /api/guides
GET /api/guides/{slug}
POST /api/reports
GET /api/admin/places
POST /api/admin/places
PATCH /api/admin/places/{place_id}
DELETE /api/admin/places/{place_id}
GET /api/admin/photos
POST /api/admin/photos/{photo_id}/review
GET /api/admin/memories
POST /api/admin/memories/{memory_id}/review
GET /api/admin/guides
POST /api/admin/guides
PATCH /api/admin/guides/{guide_id}
POST /api/admin/guides/{guide_id}/places
DELETE /api/admin/guides/{guide_id}/places/{place_id}
GET /api/admin/reports
PATCH /api/admin/reports/{report_id}
```

`DELETE /api/admin/places/{place_id}` archiwizuje rekord przez `status=archived`.

Schemat bazy jest zarzadzany przez Alembic. Aplikacja uruchamia migracje przy starcie, a `scripts/check.sh` uruchamia migracje przed walidacja schematu.

Zdjecia i pamiatki trafiaja najpierw do moderacji jako `pending`. Oryginal jest zapisywany w prywatnym storage, a publiczna kopia i miniatura sa generowane osobno bez EXIF. Upload wymaga jawnego pola zgody `consent_confirmed=true`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend startuje domyslnie pod `http://127.0.0.1:5173`.

Strony:

```txt
/       publiczna mapa
/guides przewodniki
/admin  prosty panel redakcji miejsc
```

## Sprawdzenia

```bash
cd backend
pytest
python -m compileall app

cd ../frontend
npm run lint
npm run test
npm run build
```

Pelny check:

```bash
./scripts/check.sh
```
