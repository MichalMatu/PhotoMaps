# PhotoMaps — handoff do następnego czatu

Data stanu: 2026-09-19

## Repo / binding

- Repozytorium: `MichalMatu/PhotoMaps`
- Local Agent binding: `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607`
- Local Agent repo binding: `photomaps` / `MichalMatu/PhotoMaps`
- `docs/SANDBOX_EXECUTION_FLOW.md` ma status ACTIVE: ChatGPT sandbox jest domyślnym workerem software, GitHub Actions canonical verifierem, a Local Agent jest używany tylko do pracy wymagającej lokalnego Maca, lokalnych danych albo usług.

## Obowiązkowy fresh start

Przed jakimkolwiek zapisem:

1. przeczytaj świeże `AGENTS.md`, `README.md`, `docs/SANDBOX_EXECUTION_FLOW.md`, ten plik i lokalny `AGENTS.md` dotykanego subsystemu;
2. pobierz świeży `main`; GitHub jest źródłem prawdy i nie wolno zakładać, że SHA zapisane niżej nadal jest HEAD;
3. sprawdź otwarte PR-y i nie rozpoczynaj równoległej pracy nad tym samym celem;
4. jeśli zadanie wymaga Local Agenta, najpierw sprawdź `agent-control:.agent/status/daemon.json`, użyj wyłącznie bindingu `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607` i nie duplikuj zdrowego aktywnego taska;
5. dla zmian kodu pracuj ze źródłem odpowiadającym dokładnemu target SHA i traktuj GitHub Actions jako canonical verifier.

## Stan zamkniętej fali cleanupu

Kodowy baseline przed tym docs-only handoffem:

- `main`: `7b435300c6244e4b96dcfef60583a2aa73886630`
- tree: `729a0829cdf8ab7dfcf1f91eb27afb09606a76b0`
- PR #33 `Separate final map and location responsibilities`: squash-merged
- canonical PR CI #277: SUCCESS
- post-merge Sandbox Pack #262: SUCCESS
- post-merge push CI #278: SUCCESS
- otwarte PR-y przed aktualizacją dokumentacji: brak

Po merge tego docs-only PR-a świeży `main` będzie nowszy od powyższego SHA; zawsze używaj wtedy aktualnego HEAD.

## Co zakończono

Autonomiczna behavior-preserving fala cleanupu #15–#33 została domknięta. Najważniejsze rezultaty:

- publiczna mapa ma rozdzielone shell/orchestration/layout/gallery/motion responsibilities;
- frontendowe DTO API są rozbite na owner modules, a `types.ts` jest lekkim barrel-em;
- rodzina photo detail jest wydzielona do własnego feature directory wraz z gestami i prezentacją;
- rodzina pinned media jest wydzielona do `map/pinned-media/`;
- `LocationPicker` został rozdzielony na map adapter i lookup/formatting helpers;
- edycja tekstu zdjęcia używa wspólnego draft flow zamiast zduplikowanej logiki;
- marker-specific timing/style należy do `placeMarkerMotion.ts`, a `mapMotion.ts` pozostaje właścicielem motion/layout galerii;
- autosave lokalizacji miejsca ma własny `usePlaceLocationAutoSave.ts`, a `usePlaceFormDraft.ts` skupia się na stanie i payload orchestration formularza.

Frontend baseline po #33: 91 plików Vitest / 332 testy. Pełny Vitest, TypeScript + e2e typecheck, ESLint, Knip i Vite production build były zielone dla finalnego code refactoru.

## Wniosek z finalnego auditu

Główna fala frontend structural cleanupu jest zakończona. Nie ma kolejnego obowiązkowego refactor slice'a.

Przejrzane duże pliki, m.in. `appConfigForm.ts`, `AdminPlacesPage.tsx`, `AdminConfigMapPanel.tsx`, `useAdminConfigDraft.ts`, `useAdminPanelData.ts`, `usePlacePhotoPanel.ts` i `PhotoQueue.tsx`, są wystarczająco spójne odpowiedzialnościowo. Nie dziel ich mechanicznie tylko dlatego, że są duże.

Dalszą pracę zaczynaj dopiero od jednego z dwóch źródeł:

- konkretnej funkcji, regresji albo problemu wskazanego przez użytkownika;
- świeżego read-only auditu pokazującego realnie pomieszane odpowiedzialności, ryzyko albo martwy kontrakt.

Backend ma nadal większe serwisy, ale nie ma zatwierdzonego kolejnego backendowego refaktoru. Jeżeli użytkownik poprosi o deep audit backendu, najpierw odtwórz call graph i ownership; nie dziel po samym line count.

## Aktualne ownership

Mapa:

- `PlaceMap.tsx` — public map shell;
- `PlaceLayer.tsx` — high-level orchestration miejsc;
- `useMapMarkerLayout.ts` — projection/viewport/density/collision;
- `usePlaceGalleryData.ts` — photo query + gallery/detail/report derived data;
- `mapMotion.ts` — gallery motion/layout helpers;
- `placeMarkerMotion.ts` — marker motion signatures oraz marker-entry timing/style;
- `photo-detail/` — medium modal, prezentacja, nawigacja i gesty;
- `pinned-media/` — pinned board, layout, persistence i interakcje.

Admin:

- `usePlaceFormDraft.ts` — stan formularza miejsca i payload orchestration;
- `usePlaceLocationAutoSave.ts` — kolejka, status i lifecycle autosave lokalizacji;
- `LocationPickerMap.tsx` — map adapter wyboru lokalizacji;
- `locationPickerLookup.ts` — lookup i formatowanie wyników lokalizacji.

## Znany flaky E2E

Historycznie niestabilny był Playwright test:

`photo gallery backdrop blocks clicks on place tiles underneath`

Nie traktuj pojedynczego faila jako regresji refaktoru. Jeżeli ma być naprawiany, najpierw zreprodukuj go na świeżym `main` i zrób osobny, celowany fix.

## Wymagany sposób pracy przy kolejnych zmianach kodu

1. fresh-check `main` i otwartych PR-ów;
2. exact source dla target SHA;
3. mały, jednoznaczny zakres;
4. focused verification;
5. pełny gate adekwatny do obszaru;
6. Sandbox Pack exact head;
7. canonical PR CI;
8. squash merge z kontrolą expected head SHA;
9. po merge sprawdź nowy `main`, Sandbox Pack i push CI.

Nie buduj nowego PR-a na starym parent SHA. Jeśli `main` przesunął się równolegle, rekonstruuj zmianę na świeżym HEAD.

## Definition of done tej fali

Dla obecnej fali definition of done jest spełnione:

- public map ma czytelne feature ownership;
- API DTO mają owner modules;
- największe frontendowe mixed responsibilities zostały rozdzielone tam, gdzie dawało to realny efekt;
- lint/typecheck/Knip/tests/build są green;
- dalsze dzielenie wskazanych dużych plików dawałoby głównie kosmetykę zamiast redukcji ryzyka lub złożoności.

Nie wznawiaj starej listy hotspotów jako automatycznego planu kolejnych PR-ów.

## Branch hygiene

Po domknięciu tej aktualizacji należy usunąć stare branche po zmergowanych PR-ach oraz branch docs-only. Docelowo mają pozostać tylko:

- `main`
- `agent-control`

Jeżeli w przyszłości pojawią się nowe branche, oceniaj ich stan świeżo zamiast polegać na tej liście.
