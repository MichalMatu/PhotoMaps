# Dev

Backend FastAPI działa na `http://127.0.0.1:8000`, frontend Vite na `http://127.0.0.1:5174`.

Wszystko uruchamiaj z katalogu repo:

```bash
cd /Users/michal/Desktop/PhotoMap
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
