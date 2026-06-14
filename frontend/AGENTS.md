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
- Najblizsze prace mapowe to Map Experience v1, warstwa Galerie, dynamiczne kategorie i stabilizacja lekkiego `map preview`.
- Klient API nie powinien przyjmowac starych payloadow po zmianie kontraktu; migrowac aktualnych callerow i usuwac fallbacki.
- Komponenty z kilkoma wariantami maja miec jawny tryb, np. `form-only`, `with-list`, `readonly`, zamiast kilku luznych flag boolean.
- UI ma byc kompaktowy: bez powtorzonych tytulow, licznikow, pustych pasow i nadmiarowych opisow.
- Listy i siatki projektuj responsywnie: grupa moze byc centrowana, ale elementy w niepelnym rzedzie powinny startowac od lewej w obrebie tej grupy; unikaj ukladow zakodowanych tylko pod aktualna liczbe rekordow.

## Work Guidance

- Logike payloadow, filtrowania i transformacji danych trzymaj w helperach albo `src/api`, jesli jest testowalna poza UI.
- Wspolne zachowanie modali, sheetow i paneli lokuj w `components/ui` tylko wtedy, gdy rzeczywiscie jest wspolne.
- Przy zmianach CSS sprawdz, czy reguly nie tworza globalnych efektow ubocznych w adminie albo mapie.
- `src/design/tokens.css` jest zrodlem prawdy dla kolorow, powierzchni, borderow, cieni, radiusow, typografii, motion i podstawowego spacingu.
- Nie dodawaj nowych raw kolorow poza `tokens.css`; komponenty i style maja uzywac `--surface-*`, `--content-*`, `--border-*`, `--accent-*` albo semantycznych tokenow statusu.
- Nie dodawaj nowych raw spacingow w CSS; margin, padding i gap powinny uzywac `--space-*`, a wyjatki wymagaja swiadomej aktualizacji baseline w `scripts/quality/css_token_gate.py`.
- Nowe karty i panele zaczynaj od `ui-card`, `ui-panel` albo `ui-table-panel`; lokalna klasa komponentu powinna dopisywac tylko layout, rozmiary mediow albo specyficzny stan.
- Nowe przyciski wariantowe uzywaja `ui-button` z wariantem `ui-button--primary`, `ui-button--secondary`, `ui-button--ghost` albo `ui-button--danger`; zwykly `<button>` zostaje tylko dla domyslnej akcji primary.
- Statusy i badge uzywaja `ui-status ui-status--{status}`; nie tworz lokalnych palet statusow.
- Formularze opieraj na `ui-form`, a lokalny CSS dodawaj tylko dla wyjatkowego ukladu pol, fieldsetu, mapy albo uploadu.
- Empty, loading i error states powinny uzywac `ui-empty`, `ui-help` albo `ui-error`, chyba ze komponent ma naprawde unikalny kontekst wizualny.
- Lokalny CSS jest dopuszczalny tylko dla unikalnego layoutu komponentu; nie powtarzaj w nim bazowego background/border/radius/shadow/padding kart i paneli.
- Nie pokazuj technicznych pol backendu w UI, jesli root `AGENTS.md` wskazuje etykiety domenowe.
- Po zmianach wizualnych sprawdz uklad na desktopie i mobilnie, zwlaszcza tekst w przyciskach, modalach i sheetach.

## Verification

- `cd frontend && npm run test`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e` po zmianach publicznego flow mapy, uploadu albo krytycznego admin UI.

## Child Index

- `src/components/admin/AGENTS.md` - admin UI, CRUD, moderacja i raporty.
- `src/components/map/AGENTS.md` - publiczna mapa, markery, sheets i warstwy.
