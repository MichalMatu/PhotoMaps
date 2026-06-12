# AGENTS.md - Frontend

## Purpose

Frontend odpowiada za publiczna mape, panel admina, klienta API, komponenty UI, style i testy zachowania interfejsu.

## Ownership

- `src/api` trzyma klienta HTTP, typy i payloady API.
- `src/pages` sklada strony publiczne i adminowe.
- `src/components/map` trzyma publiczna mape i przeplywy uzytkownika mapy.
- `src/components/admin` trzyma panel admina.
- `src/components/places` trzyma publiczne formularze i panele przypiete do miejsca.
- `src/components/ui` trzyma wspolne kontrolki UI.
- `src/styles` i `src/design` trzymaja CSS oraz tokeny.

## Local Contracts

- Publiczny UI i admin UI pozostaja osobnymi przeplywami.
- Publiczna mapa ma od razu pokazywac atrakcyjne miniatury albo klastry; nie redukowac jej do pustej mapy z pinami.
- Kategorie w filtrach i widokach mapy maja pochodzic z API, nie z hardkodowanej listy.
- Klient API nie powinien przyjmowac starych payloadow po zmianie kontraktu; migrowac aktualnych callerow i usuwac fallbacki.
- Komponenty z kilkoma wariantami maja miec jawny tryb, np. `form-only`, `with-list`, `readonly`, zamiast kilku luznych flag boolean.
- UI ma byc kompaktowy: bez powtorzonych tytulow, licznikow, pustych pasow i nadmiarowych opisow.

## Work Guidance

- Logike payloadow, filtrowania i transformacji danych trzymaj w helperach albo `src/api`, jesli jest testowalna poza UI.
- Wspolne zachowanie modali, sheetow i paneli lokuj w `components/ui` tylko wtedy, gdy rzeczywiscie jest wspolne.
- Przy zmianach CSS sprawdz, czy reguly nie tworza globalnych efektow ubocznych w adminie albo mapie.
- Nie pokazuj technicznych pol backendu w UI, jesli root `AGENTS.md` wskazuje etykiety domenowe.
- Po zmianach wizualnych sprawdz uklad na desktopie i mobilnie, zwlaszcza tekst w przyciskach, modalach i sheetach.

## Verification

- `cd frontend && npm run test`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e` po zmianach publicznego flow mapy, uploadu albo krytycznego admin UI.

## Child Index

- `src/components/admin/AGENTS.md` - admin UI, CRUD, moderacja i raporty.
- `src/components/map/AGENTS.md` - publiczna mapa, markery, sheets i warstwy.
