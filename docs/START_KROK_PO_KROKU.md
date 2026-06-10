# Start projektu krok po kroku

## 1. Utwórz folder projektu

```bash
mkdir wroclaw-bez-sciemy
cd wroclaw-bez-sciemy
```

## 2. Pobierz WreckScanner jako legacy reference

```bash
mkdir -p _legacy
git clone https://github.com/yerbamate0010/WreckScanner.git _legacy/WreckScanner
```

Nie pracuj w folderze `_legacy/WreckScanner`. To jest tylko referencja.

## 3. Dodaj AGENTS.md

Skopiuj plik `AGENTS.md` do root projektu:

```txt
wroclaw-bez-sciemy/AGENTS.md
```

## 4. Otwórz projekt w VS Code

```bash
code .
```

## 5. Uruchom Codexa w root projektu

Wklej prompt z pliku `PROMPT_STARTOWY_CODEX.md`.

## 6. Po pracy agenta uruchom backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

## 7. Uruchom frontend

W drugim terminalu:

```bash
cd frontend
npm run dev
```

## 8. Sprawdź lokalnie

- Backend: `http://127.0.0.1:8000/health`
- API docs: `http://127.0.0.1:8000/docs`
- Frontend: adres podany przez Vite, zwykle `http://localhost:5173`

## 9. Następny prompt po działającym szkielecie

Dopiero gdy działa mapa + places + admin, daj agentowi następny etap:

```txt
Dodaj upload zdjęć do place, private original, public copy bez EXIF, thumbnail, status pending/approved/rejected i prostą kolejkę moderacji admina. Nie dodawaj jeszcze memories, audio ani płatności.
```
