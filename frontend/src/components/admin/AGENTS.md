# AGENTS.md - Admin UI

## Purpose

Admin UI sluzy do korekt, moderacji i pojedynczych zmian w danych. Nie jest narzedziem do masowego dodawania miast ani miejsc; wieksze partie danych ida przez content pipeline.

## Ownership

- Sekcje admina skladaja widoki dla miejsc, kategorii, zdjec, pamiatek, tras/kolekcji i raportow.
- Hooki `use*Actions`, `useAdmin*` i helpery stanu trzymaja logike przeplywow, payloadow oraz wyborow.
- Modale formularzy trzymaja tylko dane potrzebne do danej akcji.
- Kolejki mediow i raportow sa osobnymi trybami pracy, nie dodatkiem do formularzy tworzenia.

## Local Contracts

- Formularz dodawania albo edycji nie powinien automatycznie pokazywac listy istniejacych rekordow.
- Modal akcji pokazuje tylko pola potrzebne do wykonania tej akcji.
- Lista, ranking, historia, moderacja i edycja maja byc osobnymi trybami albo jawnie nazwanymi sekcjami.
- Liczniki pokazuj w jednym sensownym miejscu; nie powtarzaj ich w karcie i obok listy.
- Admin moze uzywac technicznego wyboru lokalizacji na mapie, ale publiczny marker pozostaje miniatura miejsca.
- Zmiany payloadow admin API wymagaja aktualizacji klienta API i testu helpera albo akcji.

## Work Guidance

- Gdy komponent zaczyna laczyc formularz, liste i szczegoly rekordu, rozbij go albo wprowadz jawny tryb komponentu.
- Preferuj testowalne helpery dla wyboru sekcji, stanu uploadu, grupowania mediow i selekcji miejsc do trasy albo kolekcji.
- Nie dodawaj opisow wyjasniajacych oczywiste UI; popraw layout, etykiete albo kolejnosc pol.
- Przy pracy na modalach sprawdz wysokosc, szerokosc, puste obszary i zachowanie dlugiego tekstu.

## Verification

- `cd frontend && npm run test -- src/components/admin`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e` po zmianach krytycznych przeplywow admina.

## Child Index

Brak lokalnych child docs.
