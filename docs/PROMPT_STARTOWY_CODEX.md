# Prompt startowy dla Codexa

Pracujesz w nowym repozytorium `wroclaw-bez-sciemy`.

W folderze `_legacy/WreckScanner` może znajdować się stare repo WreckScanner. Ten folder jest tylko do czytania i służy jako materiał referencyjny. Nie modyfikuj niczego w `_legacy`.

Najpierw przeczytaj `AGENTS.md` i stosuj się do niego bez wyjątku.

Twoim zadaniem jest zbudować pierwszy czysty szkielet projektu MVP dla lokalnego przewodnika po Wrocławiu.

## Cel pierwszej sesji

Utwórz działający szkielet aplikacji:

- backend FastAPI,
- SQLite,
- modele `Category` i `Place`,
- seed kategorii startowych,
- publiczne endpointy `/health`, `/api/categories`, `/api/places`, `/api/places/{id_or_slug}`,
- podstawowe endpointy admina dla miejsc,
- frontend React + Vite + TypeScript,
- mapa Leaflet pokazująca miejsca z `/api/places`,
- prosty panel admina do dodania miejsca,
- README z instrukcją uruchomienia.

## Ważne ograniczenia

Nie implementuj jeszcze:

- zdjęć,
- pamiątek,
- audio,
- płatności,
- historii,
- kont użytkowników,
- paszportu,
- wielojęzyczności.

Nie używaj nazw domenowych ze starego projektu:

```txt
wreck, wrecks, vehicle, candidate, scan, YOLO, field_photo, savedWreck
```

Nowy system ma być `place-centric`.

## Oczekiwana struktura

Utwórz strukturę:

```txt
backend/
  app/
    main.py
    api/
      routes/
        categories.py
        places.py
        admin_places.py
    core/
      config.py
    db/
      session.py
      init_db.py
    models/
      category.py
      place.py
    schemas/
      category.py
      place.py
    services/
      ranking.py
    tests/
  data/
  storage/
    private/
    public/
  requirements.txt
frontend/
  src/
    api/client.ts
    components/map/PlaceMap.tsx
    components/map/PlaceMarker.tsx
    components/places/PlacePopup.tsx
    components/admin/PlaceForm.tsx
    pages/PublicMapPage.tsx
    pages/AdminPlacesPage.tsx
    main.tsx
  package.json
README.md
.gitignore
```

Możesz dostosować strukturę, jeśli masz dobry powód, ale zachowaj separację domen.

## Backend — wymagania szczegółowe

Użyj:

- FastAPI,
- SQLModel albo SQLAlchemy,
- SQLite,
- Pydantic schemas,
- CORS dla lokalnego frontendu.

Baza SQLite:

```txt
backend/data/app.db
```

Modele minimalne:

### Category

- `id: str` jako klucz główny,
- `label: str`,
- `description: str | None`,
- `icon: str | None`,
- `sort_order: int`.

### Place

- `id: str` jako UUID string,
- `slug: str` unique,
- `title: str`,
- `description: str | None`,
- `local_comment: str | None`,
- `category_id: str | None`,
- `lat: float`,
- `lon: float`,
- `weight: float = 1.0`,
- `status: str = "draft"`,
- `is_chain: bool = False`,
- `photo_count: int = 0`,
- `memory_count: int = 0`,
- `cover_photo_id: str | None`,
- `created_at`,
- `updated_at`.

Seed kategorii:

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

Endpointy publiczne:

```txt
GET /health
GET /api/categories
GET /api/places
GET /api/places/{id_or_slug}
```

Endpointy admina:

```txt
POST /api/admin/places
PATCH /api/admin/places/{place_id}
DELETE /api/admin/places/{place_id}
```

Na MVP `DELETE` ma ustawiać `status = archived`, nie kasować fizycznie.

`GET /api/places` publicznie ma domyślnie zwracać tylko `status = published` i `is_chain = false`.

Dodaj helper rankingu:

```txt
score = (photo_count + memory_count * 2) * weight
```

Score może być zwracany w API places.

## Frontend — wymagania szczegółowe

Użyj:

- React,
- Vite,
- TypeScript,
- Leaflet / React-Leaflet.

Strony:

```txt
/       publiczna mapa
/admin  prosty admin miejsc
```

Publiczna mapa:

- pobiera `/api/places`,
- renderuje markery,
- popup pokazuje nazwę, kategorię, krótki komentarz, score, liczbę zdjęć i pamiątek,
- jeśli brak miejsc, pokazuje jasny komunikat.

Admin:

- formularz dodania miejsca,
- pola: title, category, lat, lon, description, local_comment, weight, status, is_chain,
- po dodaniu miejsce ma pojawić się na liście admina,
- nie buduj jeszcze pełnego logowania; można użyć prostego placeholdera.

## Komendy instalacyjne

Jeżeli projekt nie ma jeszcze środowiska, przygotuj je.

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install fastapi "uvicorn[standard]" sqlmodel pydantic-settings python-slugify pytest ruff
pip freeze > requirements.txt
```

Frontend:

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install leaflet react-leaflet @types/leaflet
```

Jeżeli folder `frontend` już istnieje, nie twórz go drugi raz — zaktualizuj istniejący.

## Test po zakończeniu

Na koniec uruchom lub opisz komendy:

Backend:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm run dev
```

Sprawdź:

- `/health` działa,
- `/api/categories` zwraca kategorie,
- `/api/places` działa,
- frontend się buduje przez `npm run build`,
- mapa się ładuje,
- admin może dodać miejsce.

## Oczekiwany wynik odpowiedzi

Po zakończeniu pracy podaj:

1. listę utworzonych plików,
2. komendy uruchomienia backendu i frontendu,
3. co zostało zrobione,
4. co jest następnym etapem,
5. czego celowo jeszcze nie implementowałeś.
