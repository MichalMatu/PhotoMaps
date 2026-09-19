# PhotoMaps — handoff do następnego czatu

Data stanu: 2026-09-19

## Repo / binding

- Repozytorium: `MichalMatu/PhotoMaps`
- Local Agent binding: `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607`
- Local Agent repo binding: `photomaps` / `MichalMatu/PhotoMaps`
- `docs/SANDBOX_EXECUTION_FLOW.md` ma status ACTIVE: ChatGPT sandbox jest domyślnym workerem software, GitHub Actions canonical verifierem, a Local Agent tylko dla zadań wymagających lokalnego Maca/danych/usług.

## Obowiązkowy fresh start

Przed jakimkolwiek zapisem:

1. przeczytaj świeże `AGENTS.md`, `README.md`, `docs/SANDBOX_EXECUTION_FLOW.md`, ten plik i lokalny `AGENTS.md` dotykanego subsystemu;
2. pobierz świeży `main` i nie zakładaj, że SHA z handoffu nadal jest HEAD;
3. sprawdź otwarte PR-y i nie uruchamiaj równoległego refaktoru tego samego obszaru;
4. jeżeli zadanie faktycznie wymaga Local Agenta, najpierw sprawdź świeży `agent-control:.agent/status/daemon.json` i użyj wyłącznie bindingu `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607`;
5. do testów/edycji używaj exact source snapshot odpowiadającego target SHA.

## Dokładny stan przy handoffie

W chwili zapisu:

- `main`: `f6b27d0ea7f0c86c34f37adef225017320f89da8`
- tree: `69315980d54b972a070c418df29f7ef43bd22c72`
- PR #28 `Group photo detail feature files`: squash-merged
- PR #28 branch head: `b6b9db6a8b38461691a2c88f66085bfdd76651b8`
- canonical PR CI #264: SUCCESS
- post-merge Sandbox Pack #245: SUCCESS
- post-merge push CI #265: SUCCESS
- otwarte PR-y: brak

Jeżeli świeży `main` jest nowszy, GitHub jest źródłem prawdy i plan trzeba odtworzyć na świeżym HEAD.

## Co zakończono w tej serii

### Public map — PR #15–#18

- `PlaceMap` odchudzony do shell/container responsibilities.
- `PlaceLayer` przejął orkiestrację warstwy miejsc.
- `useMapMarkerLayout` przejął projection/viewport/density/collision.
- `usePlaceGalleryData` przejął photo query i derived gallery/detail/report data.
- marker motion został ograniczony do nowych/zmienionych miejsc bez remountu niezmienionych markerów.
- refaktory były behavior-preserving i przeszły canonical CI.

### Frontend API types — PR #19–#25

Monolityczny `frontend/src/api/types.ts` został rozbity na owner modules:

- `types/content.ts`
- `types/config.ts`
- `types/taxonomy.ts`
- `types/localData.ts`
- `types/media.ts`
- `types/places.ts`
- `types/map.ts`
- `types/guides.ts`
- `types/reports.ts`

`frontend/src/api/types.ts` ma teraz 78 linii i jest wyłącznie stabilnym re-export barrel — nie definiuje własnych DTO. Production API clients importują owner contracts bezpośrednio. Usunięto tylko martwe barrel re-exports wskazane przez Knip.

### Photo detail — PR #26–#28

- swipe/pointer lifecycle przeniesiony do `usePhotoDetailSwipeNavigation.ts`;
- info/copy presentation przeniesiony do `PhotoDetailInfoPanel.tsx` z regresyjnymi testami;
- `PhotoDetailModal.tsx` spadł z ok. 417 do 237 linii;
- cała rodzina 15 plików `PhotoDetail*`, `photoDetail*`, `usePhotoDetail*` jest teraz w `frontend/src/components/map/photo-detail/`;
- #28 był move/ownership-only: bez zmian runtime/API/DOM/CSS/product behavior.

Aktualny frontend baseline po tej serii: 90 plików Vitest / 329 testów.

## Aktualna architektura mapy

`frontend/src/components/map/AGENTS.md` jest lokalnym kontraktem.

Najważniejsze granice:

- `PlaceMap.tsx` — public map shell;
- `PlaceLayer.tsx` — high-level UI orchestration miejsc;
- `PlaceMarker.tsx` — marker UI;
- `useMapMarkerLayout.ts` — marker layout pipeline;
- `useCenteredPlaceGallery.ts` — centering lifecycle;
- `usePlaceGalleryData.ts` — photo query + gallery/detail/report derived data;
- `placeMarkerMotion.ts` — aggregate/per-place motion signature;
- `photo-detail/` — modal medium, prezentacja, nawigacja i gesty.

Nie zmieniaj lekkiego `map preview` w pełny payload i nie ograniczaj rozwiniętej galerii stałym niskim limitem zdjęć.

## Następny naturalny slice: pinned media

W starym czacie powstał lokalny, **nieopublikowany** draft grupowania pinned-media. Nie ma dla niego commita, brancha ani PR-a na GitHub. Nowy czat ma odtworzyć go ze świeżego `main`, a nie polegać na starym `/mnt/data`.

Rekomendowany zakres jednego move-only PR-a:

Przenieść 14 plików rodziny pinned media do `frontend/src/components/map/pinned-media/`:

- `PinnedMediaBoard.tsx`
- `PinnedMediaCard.tsx`
- `PinnedMediaCard.test.tsx`
- `PinnedMediaMapLink.tsx`
- `pinnedMediaBoard.test.ts`
- `pinnedMediaBoardCards.ts`
- `pinnedMediaBoardDom.ts`
- `pinnedMediaBoardInteraction.ts`
- `pinnedMediaBoardLayout.ts`
- `pinnedMediaBoardLinkGeometry.ts`
- `pinnedMediaBoardStorage.ts`
- `pinnedMediaBoardTypes.ts`
- `pinnedMediaPersistence.test.ts`
- `usePinnedMediaBoard.ts`

Poprawić tylko konieczne importy w `PlaceMap.tsx`, `PlaceLayer.tsx` i `photo-detail/photoDetailPin.ts` oraz ownership line w `frontend/src/components/map/AGENTS.md`. Bez zmian runtime, API, DOM, CSS i product behavior.

Stary lokalny draft miał zielone: Prettier, TypeScript + e2e typecheck, ESLint i Knip. **Nie wykonano jeszcze pełnego Vitest/build, exact Sandbox Pack ani canonical PR CI**, więc jest to tylko sprawdzony kierunek, nie gotowy commit.

## Ile realnie zostało

### Minimum wysokiego ROI: około 4–6 małych PR-ów

Po #28 największa część map/API cleanupu jest zamknięta. Do rozsądnego domknięcia głównego frontend structural cleanupu wystarczy mniej więcej:

1. pinned-media move-only grouping — 1 PR;
2. audit rodziny `mapMarker*` i ewentualne grouping/ownership tylko jeśli faktycznie poprawi granice — 0–1 PR;
3. 2–3 wybrane hotspoty admina, gdzie da się realnie oddzielić odpowiedzialności;
4. osobny fix/utwardzenie znanego flaky E2E dla gallery backdrop, jeżeli nadal reprodukuje się na świeżym `main`.

### Pełny deep cleanup repo: około 10–15 sensownych PR-ów

Jeżeli celem jest dalszy głęboki audit całego repo, kolejne kandydaty są poniżej. Nie zakładaj, że każdy duży plik wymaga rozbicia.

#### Frontend hotspots na `main`

11 produkcyjnych plików ma >=300 linii. Największe:

- `components/admin/usePlaceFormDraft.ts` — 348
- `components/admin/LocationPicker.tsx` — 346
- `components/admin/appConfigForm.ts` — 339
- `components/admin/PhotoQueue.tsx` — 338
- `pages/AdminPlacesPage.tsx` — 332
- `components/map/mapMotion.ts` — 332
- `components/admin/AdminConfigMapPanel.tsx` — 322
- `components/admin/usePlacePhotoPanel.ts` — 321
- `components/map/pinnedMediaBoardLayout.ts` — 315
- `components/admin/useAdminConfigDraft.ts` — 307
- `components/admin/useAdminPanelData.ts` — 302

Po pinned-media największy realny dług strukturalny frontendu jest głównie w adminie. `mapMotion.ts` i podobne algorytmiczne helpery mają testy i mogą zostać duże, jeśli są spójne odpowiedzialnościowo.

#### Backend hotspots na `main`

- `services/local_data_diagnostics_media.py` — 481
- `services/media/images.py` — 367
- `services/app_config.py` — 353
- `services/places.py` — 327
- `services/media/redaction.py` — 317
- `services/admin_photos.py` — 311
- `services/media/audio.py` — 308

Przed refaktorem backendu zrób preimplementation audit odpowiedzialności i call graphu. Nie dziel plików wyłącznie przez line count.

## Zalecana kolejność

1. Odtwórz i domknij pinned-media move-only jako najwęższy bezpieczny PR.
2. Po merge wykonaj świeży read-only audit `frontend/src/components/map`; marker-family grupuj tylko jeśli poprawia ownership, nie dla kosmetyki.
3. Przejdź do admina: zrób preimplementation audit 2–3 największych plików i wybierz jeden z wyraźną separacją state/UI/derived data.
4. Backend rusz dopiero po osobnym audicie; zachowuj endpoint/schema/storage behavior.
5. Flaky E2E naprawiaj osobno, bez mieszania z refaktorami produkcyjnymi.

## Znany flaky test

Historycznie niestabilny był Playwright test:

`photo gallery backdrop blocks clicks on place tiles underneath`

Był reprodukowalny także na niezmienionym base, więc pojedynczy fail nie jest automatycznie regresją refaktoru. Jeżeli ma być naprawiany, najpierw ponownie zreprodukuj go na świeżym `main` i zrób osobny PR.

## Wymagany sposób pracy

Dla każdego następnego refaktoru:

1. fresh-check `main`;
2. exact source snapshot target SHA;
3. mały, behavior-preserving zakres;
4. narrow static/test gate;
5. pełny gate adekwatny do obszaru;
6. jeden zamknięty commit/branch;
7. Sandbox Pack exact head + weryfikacja artifactu;
8. canonical PR CI;
9. squash merge z kontrolą expected head SHA;
10. po merge sprawdź nowy `main`, Sandbox Pack i push CI przed kolejnym PR-em.

Nie buduj kolejnego PR-a na starym parent SHA. Jeżeli `main` zmienił się równolegle, rekonstruuj tree na świeżym HEAD.

## Definition of done tej fali cleanupu

Nie próbuj doprowadzić do „wszystko <200 linii”. Fala jest skończona, gdy:

- public map ma czytelne feature ownership;
- API DTO mają owner modules;
- największe adminowe pliki nie mieszają kilku niezależnych odpowiedzialności;
- backendowe serwisy mają rozsądne granice domenowe;
- Knip/typecheck/lint/tests/build są green;
- dalsze dzielenie dawałoby głównie kosmetykę zamiast redukcji ryzyka lub złożoności.
