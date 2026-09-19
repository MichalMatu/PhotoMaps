# Prompt startowy do następnego czatu — PhotoMaps

Kontynuujemy autonomiczny behavior-preserving cleanup/hardening repozytorium `MichalMatu/PhotoMaps` dokładnie z bieżącego handoffu.

Najpierw przeczytaj świeże:

- `AGENTS.md`
- `README.md`
- `docs/SANDBOX_EXECUTION_FLOW.md`
- `docs/HANDOFF_NEXT_CHAT.md`
- `frontend/src/components/map/AGENTS.md`

Przed jakimkolwiek zapisem pobierz świeży `main` i sprawdź otwarte PR-y. Handoff ma zapisany punkt `main` `f6b27d0ea7f0c86c34f37adef225017320f89da8`, ale GitHub jest źródłem prawdy — jeżeli HEAD jest nowszy, pracuj wyłącznie na świeżym stanie.

Local Agent binding tego projektu to `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607`, repo binding `photomaps` / `MichalMatu/PhotoMaps`. Zgodnie z aktywnym sandbox flow używaj ChatGPT sandbox jako domyślnego workera software i GitHub Actions jako canonical verifiera. Local Agenta używaj tylko, jeżeli zadanie naprawdę wymaga lokalnego Maca/danych/usług; wtedy najpierw sprawdź świeży `agent-control:.agent/status/daemon.json` i brak duplikatu zadania.

Stan przy handoffie: PR #28 `Group photo detail feature files` jest już squash-merged, canonical PR CI #264 green, a post-merge Sandbox Pack #245 i push CI #265 są green. Nie ma otwartych PR-ów.

Najpierw odtwórz ze świeżego `main` najwęższy następny slice opisany w handoffie: **move-only grouping rodziny pinned media** do `frontend/src/components/map/pinned-media/`. Ma to być czysta reorganizacja 14 plików z korektą tylko koniecznych importów i ownership line w mapowym `AGENTS.md`; bez zmian runtime, API, DOM, CSS i product behavior.

Nie ufaj staremu `/mnt/data` z poprzedniego czatu. Zbuduj zmianę od świeżego exact-source snapshotu. Najpierw potwierdź zakres diffu i testy, potem pełna weryfikacja: format, TypeScript + e2e typecheck, ESLint, Knip, pełny Vitest, Vite build, exact Sandbox Pack artifact, canonical PR CI. Merge dopiero po green; po merge sprawdź świeży `main` oraz post-merge Sandbox Pack i push CI.

Po domknięciu pinned-media nie refaktoryzuj mechanicznie wszystkiego dużego. Zrób świeży read-only audit mapy/admina i wybieraj tylko miejsca z realnie mieszanymi odpowiedzialnościami. `docs/HANDOFF_NEXT_CHAT.md` zawiera ocenę pozostałego zakresu, hotspoty i definition of done.
