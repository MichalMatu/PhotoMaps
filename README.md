# Wrocław Bez Ściemy

Lokalny przewodnik po Wrocławiu oparty o mapę miejsc z charakterem. MVP ma publiczną mapę, admina miejsc, zdjęcia miejsc, pamiątki użytkowników, przewodniki i zgłoszenia problemów.

## Dev

Backend FastAPI działa na `http://127.0.0.1:8000`, frontend Vite na `http://127.0.0.1:5174`.

Uruchom backend:

```bash
cd /Users/michal/Desktop/PhotoMap
./scripts/dev_backend.sh
```

Uruchom frontend:

```bash
cd /Users/michal/Desktop/PhotoMap/frontend
npm run dev -- --port 5174
```

Sprawdź backend:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/api/places/map
```

Sprawdź, co trzyma port:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:5174 -sTCP:LISTEN
```

Zabij proces po PID z `lsof`:

```bash
kill PID
```

Pełny check:

```bash
./scripts/check.sh
```
