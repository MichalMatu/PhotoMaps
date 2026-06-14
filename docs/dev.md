# Dev

Backend FastAPI działa na `http://127.0.0.1:8000`, frontend Vite na `http://127.0.0.1:5174`.

Wszystko uruchamiaj z katalogu repo:

```bash
cd <repo-root>
```

## Komendy

```bash
make start    # uruchom backend + frontend
make stop     # zatrzymaj backend + frontend
make restart  # zatrzymaj i uruchom oba procesy od nowa
make status   # pokaż PID-y, porty i health
make logs     # pokaż ostatnie logi
make check    # pełny check projektu
```

`make start` zapisuje PID-y i logi w `.dev/`. Ten katalog jest lokalny i nie jest commitowany.

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

## Adresy

```bash
http://127.0.0.1:5174
http://127.0.0.1:8000/health
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
