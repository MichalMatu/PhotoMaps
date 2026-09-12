# Dev

Backend FastAPI działa na `http://127.0.0.1:8000`, frontend Vite na `http://127.0.0.1:5174`.

Wszystko uruchamiaj z katalogu repo:

```bash
cd <repo-root>
```

## Komendy

```bash
make help     # pokaż główne menu
make scripts  # pokaż spis skrótów do scripts/
make start    # uruchom backend + frontend
make stop     # zatrzymaj backend + frontend
make restart  # zatrzymaj i uruchom oba procesy od nowa
make status   # pokaż PID-y, porty i health
make logs     # pokaż ostatnie logi
make check    # pełny check projektu
```

`make start` zapisuje PID-y i logi w `.dev/`. Ten katalog jest lokalny i nie jest commitowany.
Pełny spis skrótów operacyjnych jest w [`scripts/README.md`](../scripts/README.md).

## Hooki jakości

Hooki są skonfigurowane w `.pre-commit-config.yaml`. Narzędzia instalujemy lokalnie przez Homebrew:

```bash
brew install pre-commit shellcheck
pre-commit install --hook-type pre-commit --hook-type pre-push
```

Jeśli pracujesz tylko przez backendowy virtualenv, `pre-commit` może też działać jako `./backend/.venv/bin/pre-commit`.

Przed większym commitem możesz odpalić je ręcznie:

```bash
pre-commit run --all-files
```

`make check` uruchamia backend Ruff format/lint, testy z coverage, diagnostykę schematu bazy, opcjonalny `shellcheck` dla skryptów oraz frontend format/lint/knip/test/build.

## Workflow Git

`main` jest stabilnym kanałem kodu gotowego do wystawienia. Zwykłą pracę prowadź na krótkich branchach tematycznych, a do `main` przenoś tylko zamknięte etapy po testach.

Początek pracy:

```bash
git switch main
git pull --ff-only
git switch -c work/nazwa-zmiany
```

Zamknięcie etapu na branchu:

```bash
make check
git add .
git commit -m "Opis gotowego etapu"
git push -u origin work/nazwa-zmiany
```

Jeśli branch ma trafić do `main`, najpierw upewnij się, że jest po aktualnym `main` i przeszedł check. Merge albo fast-forward do `main` wykonuj dopiero po świadomej decyzji, że ten etap jest wersją gotową do publikacji.

## Testy jakości

```bash
make api-flow      # pełny flow produktu po backend API
make api-contract  # kontrakt OpenAPI dla publicznych GET endpointów
make smoke         # live smoke backendu i frontendu na izolowanych portach
make e2e           # Playwright smoke w przeglądarce Chromium
make perf-smoke    # podstawowy pomiar opóźnień live endpointów
make quality       # wszystko powyżej plus make check
```

`make smoke`, `make e2e` i `make perf-smoke` same startują backend oraz frontend na izolowanych portach i sprzątają procesy po zakończeniu.
`make e2e` dodatkowo używa osobnej bazy i storage w `.dev/e2e`, więc testy mogą tworzyć miejsca oraz zdjęcia bez dotykania lokalnych danych z `backend/data/app.db`.
Progi `perf-smoke` można dostroić przez env:

```bash
PERF_ITERATIONS=10 PERF_MAX_MS=2000 PERF_AVG_MS=800 make perf-smoke
```

## Publiczny Kontrakt API

Publiczne endpointy miejsc i tras nie zwracają pól redakcyjnych ani adminowych. `GET /api/places` i `GET /api/places/{slug}` nie zawierają `local_comment` ani `status`; pełny opis miejsca jest tylko w `article_blocks` szczegółu miejsca. Adminowe endpointy zachowują pełny kształt potrzebny do edycji.

Warstwa discovery dla agentów AI, crawlerów i prostych integracji jest jawna i publiczna:

- `GET /llms.txt` opisuje, gdzie agent ma szukać miast, miejsc, opisów i publicznych mediów.
- `GET /robots.txt` pozwala crawlerom indeksować publiczną stronę, jawnie dopuszcza główne boty AI i wskazuje sitemapę.
- `GET /sitemap.xml` zawiera realne strony publiczne: mapę, indeks tras, opublikowane trasy/kolekcje i opublikowane strony miejsc.
- `GET /api/public` zwraca indeks maszynowy aktualnych publicznych ścieżek.
- `GET /api/public/cities` zwraca aktywne miasta.
- `GET /api/public/cities/{city_id}/places` zwraca wszystkie opublikowane miejsca w aktywnym mieście, także bez covera, w lekkim indeksowym kształcie.
- `GET /api/public/cities/{city_id}/places/{place_slug}` zwraca publiczny szczegół miejsca: opis wiodący, `article_blocks`, kategorie, współrzędne, publiczne pola niestandardowe oraz zatwierdzone zdjęcia z `description_blocks` i atrybucją.

Endpointy discovery nie są kontraktem pierwszego renderu mapy. Nie zastępują lekkiego `GET /api/places/map`; służą do jednoznacznego pobrania treści przez agenta bez interpretowania Reacta, mapy i interakcji UI. Nie mogą ujawniać `local_comment`, statusu moderacyjnego miejsca, prywatnych oryginałów ani ścieżek private storage.

Publiczny runtime serwujący zbudowany frontend podmienia blok `photomap-seo` w `index.html` dla `/`, `/guides`, `/guides/{slug}` i `/places/{slug}`. W odpowiedzi HTML są opisowe `<title>`, `meta description`, canonical, Open Graph/Twitter oraz JSON-LD oparte wyłącznie o publiczne dane i publiczne ścieżki mediów. `/admin` dostaje `noindex,nofollow`. Favicon i manifest aplikacji są statycznymi assetami frontendu.

`GET /api/places/map?city_id={city_id}` jest lekkim kontraktem mapy: miejsce, miasto, kategorie, score/liczniki, cover i kilka kuratorowanych `preview_items`. `city_id` jest jawnym filtrem miasta; bez niego backend zwraca publiczny map preview dla wszystkich aktywnych miast. Ten payload nie dziedziczy pełnego `PlaceRead` i nie zawiera `cover_photo_id`, timestampów, `local_comment`, `status`, `article_blocks` ani `description_blocks` zdjęć. `cover_photo` używa mapowego `PlaceMapPhotoRead` z `role`, `source` i opcjonalną atrybucją zdjęcia (`attribution_author`, `attribution_source_url`, `attribution_license`, `attribution_license_url`); `preview_items` to discriminated union po `kind`: `photo` ma `role`, `source` i atrybucję, a `memory` ich nie ma. Pierwszy widok mapy renderuje te lekkie preview; rozwinięty wachlarz miejsca po kliknięciu pobiera `GET /api/places/{place_id}/photos` (lista bez `description_blocks`) i pokazuje wszystkie zatwierdzone zdjęcia miejsca. Pełny opis TTS jednego zdjęcia ładuje `GET /api/places/{place_id}/photos/{photo_id}` dopiero w modalu szczegółu. Opublikowane miejsce bez zatwierdzonego covera albo preview nie wraca na publiczną mapę jako klasyczna pinezka.

Publiczne `GET /api/places/{place_id}/photos` zwraca tylko zatwierdzone zdjęcia w lekkim kształcie listy: ścieżki publiczne, krótki podpis `caption`, opcjonalną atrybucję i opcjonalne audio — bez `description_blocks`. Publiczne `GET /api/places/{place_id}/photos/{photo_id}` zwraca ten sam kształt plus `description_blocks`. Publiczny modal zdjęcia dociąga detail jednego medium, pokazuje `description_blocks` jako osobny tekst na ekranie i udostępnia TTS, jeśli przeglądarka wspiera `speechSynthesis`; ikona audio pozostaje wyłącznie dla realnego pliku audio. Upload audio dla zdjęć i pamiątek przyjmuje MP3, M4A i FLAC do 12 MB oraz 180 sekund. Przełącznik `Audio` w menu mapy jest opt-in dla ambient autoplayu: po otwarciu medium z audio odtwarza je w pętli z łagodnym wejściem głośności, o ile przeglądarka pozwoli na odtworzenie po interakcji użytkownika. Styl i format generowanych opisów zdjęć opisuje [`docs/create_tts.md`](create_tts.md). Upload zdjęcia miejsca jest wyłącznie adminowy przez `POST /api/admin/places/{place_id}/photos`, które przyjmuje `caption`, `description_blocks` jako JSON w polu formularza oraz pola atrybucji. Adminowy panel zdjęć konkretnego miejsca pobiera pełną listę tego miejsca przez `GET /api/admin/places/{place_id}/photos`; nie wolno opierać go na paginowanej kolejce moderacji `GET /api/admin/photos`, bo ta lista jest tylko globalnym widokiem pracy admina. Publiczne dodawanie treści użytkownika przechodzi przez pamiątki `POST /api/places/{place_id}/memories`.

Publiczne `GET /api/guides` i `GET /api/guides/{slug}` zwracają trasy/kolekcje bez statusów i timestampów oraz z publicznymi preview miejsc. Pole `kind` rozróżnia `route` i `collection`. Pole `route_points` jest opcjonalną redakcyjną geometrią linii trasy na mapie i jest puste dla kolekcji; miejsca nadal wynikają z `places`. Adminowe `/api/admin/guides` używa osobnego kształtu z polami potrzebnymi do moderacji i edycji. Kolejność miejsc w trasie albo kolekcji zmienia `PUT /api/admin/guides/{guide_id}/places/order` z pełną listą aktualnych przypięć `{places: [{place_id, sort_order}]}`; endpoint odrzuca brakujące, obce albo zdublowane miejsca, więc dodawanie i usuwanie miejsc pozostaje osobnym kontraktem.

## Admin Resources

Panel admina utrzymuje własną warstwę `adminPanelResources` zamiast React Query, bo obecny przepływ jest sesyjny i szeroki: jeden token admina ładuje ustawienia, miasta, kategorie, miejsca, publiczny preview mapy, trasy oraz kolejki moderacji, a wylogowanie musi zresetować cały stan naraz. `useAdminRefreshGraph` jawnie opisuje zależności między zasobami po mutacjach, np. zdjęcia odświeżają miejsca i publiczny preview. Migracja na React Query ma sens dopiero jako osobny etap dla całego panelu albo dla wyraźnie wydzielonej domeny admina, żeby nie zostawić dwóch konkurujących mechanizmów cache.

## Diagnostyka I Backup

Backend dodaje `X-Request-ID` do każdej odpowiedzi API. Błędy JSON zachowują dotychczasowe pole `detail` i dodają `request_id`, więc ten sam identyfikator można pokazać w UI albo odszukać w logach.

Lokalną spójność bazy i storage sprawdzisz bez uruchamiania aplikacji:

```bash
python3 scripts/diagnose_local_data.py
```

`./scripts/backup_local_data.sh --apply` uruchamia tę diagnostykę przed kopiowaniem danych i blokuje backup, jeśli znajdzie błędy. Szczegóły operacyjne są w [`docs/ops.md`](ops.md).

## Adresy

```bash
http://127.0.0.1:5174
http://127.0.0.1:8000/health
```

## Publiczny Runtime I Tunel

Publiczne wejście używa jednego procesu `server.py`: backend FastAPI, `/media` oraz statyczny build `frontend/dist` pod tym samym hostem. Build produkcyjny używa względnych URL-i API, więc przeglądarka nie odpytuje lokalnego `127.0.0.1` użytkownika.
Lokalne sekrety publicznego runtime, np. `ADMIN_TOKEN`, można trzymać w ignorowanym przez Git pliku `.env` w katalogu repo.

```bash
make server-start      # build frontendu + start PhotoMap na http://127.0.0.1:8000
make server-status
make server-logs
make server-stop
```

Tunel Cloudflare jest lokalną konfiguracją poza Git:

```bash
make tunnel-start
make tunnel-status
make tunnel-stop
```

Autostart publicznego runtime i tunelu:

```bash
make autostart-start
make autostart-status
make autostart-stop
```

## Typowy restart

```bash
make restart
make status
```

Jeśli port jest zajęty albo proces został uruchomiony ręcznie, użyj:

```bash
make stop
make status
make start
```
