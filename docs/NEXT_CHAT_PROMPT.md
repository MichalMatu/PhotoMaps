# Prompt startowy do następnego czatu — PhotoMaps

Kontynuujemy pracę nad `MichalMatu/PhotoMaps` z aktualnego stanu repozytorium.

Najpierw przeczytaj świeże:

- `AGENTS.md`
- `README.md`
- `docs/SANDBOX_EXECUTION_FLOW.md`
- `docs/HANDOFF_NEXT_CHAT.md`
- lokalny `AGENTS.md` subsystemu, którego dotyczy nowe zadanie.

Przed jakimkolwiek zapisem pobierz świeży `main` i sprawdź otwarte PR-y. GitHub jest źródłem prawdy; nie zakładaj, że SHA zapisane w handoffie nadal jest HEAD.

Local Agent binding tego projektu to `2e5d59f8-f6e4-4d75-8d1a-dce7b6bf6607`, repo binding `photomaps` / `MichalMatu/PhotoMaps`. Zgodnie z aktywnym sandbox flow używaj ChatGPT sandbox jako domyślnego workera software i GitHub Actions jako canonical verifiera. Local Agenta używaj tylko, jeżeli zadanie naprawdę wymaga lokalnego Maca, lokalnych danych albo usług; wtedy najpierw sprawdź świeży `agent-control:.agent/status/daemon.json` i brak duplikatu zdrowego taska.

Autonomiczna behavior-preserving fala structural cleanupu #15–#33 została zakończona i zweryfikowana. Public map, API types, photo-detail, pinned-media, LocationPicker, photo text draft, marker motion ownership i place-location autosave mają już rozdzielone odpowiedzialności opisane w handoffie.

Nie wznawiaj starej listy hotspotów i nie dziel plików mechanicznie przez line count. Nie ma kolejnego obowiązkowego refactor slice'a.

Następna praca powinna wynikać z:

1. konkretnej funkcji, regresji albo problemu wskazanego przez użytkownika; albo
2. świeżego read-only auditu, który pokaże realny problem ownership, złożoności, martwego kontraktu lub ryzyka.

Jeżeli nowe zadanie jest refaktorem, zachowaj behavior-preserving discipline: exact source target SHA, mały zakres, focused verification, pełny adekwatny gate, exact Sandbox Pack, canonical PR CI, squash merge i post-merge verification.
