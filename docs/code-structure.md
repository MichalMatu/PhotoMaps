# Code Structure

Ten dokument opisuje aktualne granice techniczne kodu PhotoMap. Nie jest roadmapą; ma pomagać szybko znaleźć właściwe miejsce dla testów, helperów i stylów.

## Backend Tests

Backendowe testy są w `backend/app/tests` i są podzielone według odpowiedzialności:

- `api/admin` - adminowe endpointy, autoryzacja, miasta, kategorie i konfiguracja.
- `api/places`, `api/photos`, `api/memories`, `api/guides`, `api/reports` - publiczne i adminowe kontrakty API dla danej warstwy domeny.
- `contracts` - schemat bazy, OpenAPI i kontrakty mutacji.
- `flows` - pełniejsze przepływy API.
- `importers` - importer manifestów i idempotencja content pipeline.
- `scripts` - kontrakty lokalnych skryptów dev/diagnostycznych.
- `services` - logika domenowa poza route'ami.
- `support` - jawnie importowane helpery testowe, np. nagłówki admina, uploady i fabryki modeli.

`conftest.py` zostaje dla fixture'ów pytest. Helper używany bezpośrednio przez testy powinien trafić do `backend/app/tests/support`, a nie do `conftest.py`.

## Frontend E2E

Playwright testy są w `frontend/e2e`:

- `fixtures` - dane mockowane i małe assety testowe.
- `support` - helpery Playwright, obsługa API testowego, interakcje mapy i asercje ruchu.
- `visual` - mockowane testy wizualne i snapshoty dla mapy, miejsc, tras/kolekcji i admina.
- `smoke` - API-backed smoke flows uruchamiane na izolowanej bazie przez `scripts/quality/e2e.sh`.

Snapshoty są trzymane przy specach w katalogach `*.spec.ts-snapshots`. Przy przenoszeniu speca przenieś odpowiadające snapshoty; nie aktualizuj snapshotów automatycznie bez obejrzenia różnicy.

## Frontend Styles

`frontend/src/styles/app.css` jest entrypointem importów CSS. Odpowiedzialności są rozdzielone tak:

- `ui.css` - bazowe primitives/shared UI: panele, karty, przyciski, statusy, formularze, media frame i modale.
- `content-pages.css` - publiczne strony miejsc oraz tras/kolekcji.
- `map.css` - mapa, markery, galerie miniaturek oraz sheet content mapy.
- `photo-detail.css` - pełnoekranowy podgląd zdjęcia/pamiątki i powiązane akcje właściciela pamiątki.
- `pinned-media.css` - przypięte media i wizualne połączenie z mapą.
- `map-tools.css` - shellowe kontrolki mapy.
- `admin*.css` - panele, formularze, tabele i feature-specific style admina.

Kolory, spacing współdzielony, typografia, cienie, radiusy i motion należą do `frontend/src/design/tokens.css`. Nowy CSS powinien używać tokenów; lokalny CSS dodaje tylko layout, rozmiary mediów albo stan konkretnego komponentu.

## Public Map Layout

Publiczna mapa trzyma reguły wizualnego układu w małych helperach w `frontend/src/components/map`:

- `mapDisplayConfig.ts` centralizuje stałe rozmiaru, gęstości, ruchu i kolizji markerów.
- `mapMarkerScale.ts` wylicza rozmiar pojedynczego markera miejsca z zoomu i priorytetu redakcyjnego.
- `placeGallerySizing.ts` wylicza maksymalny obszar rozwiniętej galerii miejsca z realnego viewportu, dostępnego miejsca wokół markera i liczby elementów.
- `mapMotion.ts` układa kafelki rozwiniętej galerii w chmurę/wachlarz, skaluje je do przekazanego obszaru i pilnuje krótkich opóźnień wejścia.

Pierwszy widok mapy renderuje elementy z lekkiego `map preview`, ale rozwinięta galeria miejsca po kliknięciu pobiera pełną publiczną listę zdjęć miejsca i pokazuje wszystkie zatwierdzone zdjęcia w wachlarzu. Nie ma stałego niskiego limitu widocznych miniaturek: obszar ma rosnąć na większych ekranach i dla gęstszych zestawów, ale musi pozostać bez nachodzenia kafli i bez wychodzenia poza ramkę mapy. Ten kontrakt chronią testy jednostkowe `mapMotion.test.ts` oraz E2E `frontend/e2e/visual/map-gallery-sizing.spec.ts` i `frontend/e2e/visual/map.spec.ts`.

## Refactor Closure

Większy refaktor kończy się adekwatną weryfikacją i spójnym commit/push:

- backendowy kontrakt lub struktura testów: `cd backend && ./.venv/bin/python -m pytest`, a po większej zmianie `./scripts/check.sh`;
- frontendowe komponenty albo CSS: `cd frontend && npm run test`, `npm run build`, a dla mapy/admina/layoutu także `npm run test:e2e`;
- zmiana wizualna: sanity check desktop i mobile dla dotkniętych powierzchni;
- po zielonych testach commituj tylko zamknięty etap i pushuj tę samą zmianę.
