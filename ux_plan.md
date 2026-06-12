# UX plan dopracowania jakości wizualnej

Ten plan porządkuje luźne sugestie w kolejność prac, którą można realizować etapami. Celem nie jest dodanie większej liczby efektów, tylko usunięcie przypadkowości w CSS, ruchu, zdjęciach i komponentach.

## Status prac

- Zrobione: fixture danych do oceny UI, pierwsza warstwa tokenów materiałów/media/elevation/motion, usunięcie grupowania miejsc na mapie, skalowanie markerów po zoomie i wadze miejsca, pełniejszy fan zdjęć, lepszy viewer zdjęcia.
- Zrobione: techniczny CSS quality gate bez baseline, podpięty do `scripts/check.sh` i pre-commit dla CSS.
- Zrobione: komponentowa naprawa tabeli miejsc w adminie bez `.table-row span` i bez `!important` w `admin-tables.css`.
- Zrobione: domknięcie CSS baseline w `base.css`, `layout.css`, `map-tools.css`, `map.css` i `ui.css`.
- Zrobione: admin polish jako osobny, kompaktowy tryb; domknięte są listy miejsc, kategorii, przewodników, zgłoszeń, zdjęć miejsca oraz wspólne kolejki zdjęć/pamiątek.
- W toku: motion system mapy; wykonany jest pierwszy slice dla stanów markera, otwarcia fana, desktop hover, mobile touch i `prefers-reduced-motion`.
- Zostało: motion viewera i sheetów, system zdjęć z loading/aspect-ratio, screenshot regression, kontrakt i widok przewodników.

## Rekomendowana kolejność

1. Minimalne dane/fixture do oceny UI, żeby nie projektować na pustym stanie.
2. `tokens.css`: materiały, elevation, radius, motion, overlay, media surface.
3. Mały quality gate techniczny: skrypt wykrywający nowe raw kolory, cienie, radiusy i `!important`.
4. Migracja CSS bez zmian funkcjonalnych: usunięcie raw cieni, radiusów, kolorów i zbędnych `!important`.
5. Naprawa admin table komponentowo, szczególnie selektorów typu `.table-row span`.
6. Motion system dla mapy: marker select, fan open, viewer, sheet, close, hover/active.
7. Zdjęcia jako system: aspect-ratio, loading states, caption gradient, media surface.
8. Screenshoty Playwright desktop/mobile dla kluczowych stanów.
9. Przewodniki: dopiero po dodaniu cover/preview do kontraktu.

## Doprecyzowania

### 1. Fixture do oceny UI

Najpierw przygotować mały, stabilny zestaw danych do oceny mapy i ekranów:

- kilka opublikowanych miejsc z coverami,
- jedno miejsce bez zdjęcia, żeby sprawdzić fallback,
- jedno miejsce z kilkoma zdjęciami do wachlarza,
- jedno miejsce z pamiątką,
- minimum jeden przewodnik z kilkoma miejscami,
- dane możliwe do odtworzenia lokalnie albo w e2e.

Bez takiego materiału łatwo dopracować puste stany, a przeoczyć realne problemy ze zdjęciami, gęstością mapy i długimi treściami.

### 2. Fundament tokenów

Najpierw stworzyć mały, semantyczny system zamiast rozbudowanej listy wartości:

- `material-thin`, `material-regular`, `material-heavy`,
- `elevation-low`, `elevation-floating`, `elevation-spotlight`,
- `radius-control`, `radius-panel`, `radius-media`, `radius-pill`,
- `surface-media`, `surface-overlay`, `surface-scrim`,
- `motion-fast`, `motion-regular`, `motion-slow`,
- `ease-standard`, `ease-emphasized`, `ease-spring`.

Nie tokenizować każdej pojedynczej wartości. Token ma istnieć tylko wtedy, gdy opisuje powtarzalną decyzję projektową.

### 3. Wczesny quality gate techniczny

Od razu po tokenach dodać prosty skrypt, który wykrywa nowe lokalne wyjątki w CSS:

- raw kolory poza plikiem tokenów,
- nietokenizowane `box-shadow`,
- nietokenizowane `border-radius`,
- nowe `!important`,
- lokalne czasy animacji albo easing bez tokenów motion.

Ten gate ma być tani i szybki. Nie musi jeszcze oceniać wyglądu ekranów, tylko zatrzymać dokładanie nowych przypadkowych wartości podczas kolejnych etapów.

### 4. Migracja CSS bez zmiany zachowania

Ten etap powinien być możliwie mechaniczny:

- zamienić lokalne cienie na tokeny elevation,
- zamienić lokalne promienie na tokeny radius,
- zamienić raw kolory na tokeny surface/content/border/accent,
- usunąć zbędne `!important`,
- nie zmieniać jeszcze layoutu, rozmiarów markerów ani flow użytkownika.

To pozwoli oddzielić porządkowanie systemu od późniejszych zmian UX.

### 5. Admin table i admin jako osobny tryb

Admin ma korzystać z tego samego języka wizualnego, ale mieć niższą temperaturę:

- mniej szkła i mniej ruchu niż publiczna mapa,
- kompaktowe tabele i formularze,
- przewidywalne stany focus/hover/selected,
- brak layoutowych obejść selektorami potomków, jeśli problem wynika ze struktury komponentu.

Szczególnie uważać na selektory typu `.table-row span`, bo utrudniają zmianę zawartości komórek bez efektów ubocznych.

Najpierw naprawić strukturę tabeli, a dopiero potem szlifować wygląd admina. Jeżeli CSS musi używać `!important`, zwykle oznacza to, że komponent ma zły podział odpowiedzialności albo zbyt szerokie selektory.

### 6. Motion jako system stanów

Ruch powinien wynikać z akcji użytkownika i stanu komponentu:

- wejście panelu,
- wybór markera,
- rozwinięcie fanów,
- przejście do photo viewer,
- otwarcie sheetu,
- zamknięcie,
- hover i active feedback.

Każdy ruch ma mieć odpowiednik dla `prefers-reduced-motion`. Animacje mapy mogą być bardziej emocjonalne, ale krótkie i kontrolowane.

### 7. Zdjęcia jako główna funkcja produktu

Zdjęcia nie powinny wyglądać jak załączniki. Standard dla komponentów zdjęciowych:

- stabilne `aspect-ratio`,
- brak skoków layoutu podczas ładowania,
- spójny `object-fit`,
- subtelny placeholder/loading state,
- caption czytelny na zdjęciu bez ciężkich ramek,
- wspólny `surface-media` dla zdjęć, miniaturek, fanów i kart przewodników.

`srcset` i warianty thumbnaili zostawić jako osobny etap, bo wymagają świadomej zmiany media pipeline/API.

### 8. Screenshoty Playwright

Pełne screenshoty warto dodać dopiero po ustabilizowaniu tokenów, mapy i zdjęć. Wcześniej będą kruche i będą testować wygląd, który nadal celowo się zmienia.

Zakres screenshotów:

- desktop i mobile,
- mapa pusta,
- mapa z markerami,
- otwarty fan,
- photo viewer,
- sheet "Byłem tutaj",
- admin tabela.

Screenshoty powinny korzystać z deterministycznych danych testowych, żeby nie były kruche.

### 9. Przewodniki po zmianie kontraktu

Przewodniki powinny być bardziej redakcyjne, ale nie warto robić tego samym CSS-em. Najpierw dodać do kontraktu publicznego potrzebne dane:

- cover albo leading image przewodnika,
- preview miejsc z coverem,
- liczbę miejsc,
- opcjonalnie krótki kontekst mapowy.

Po tej zmianie można dopiero projektować widok przewodnika jako realny produktowy ekran, a nie generyczną listę tekstowych kart.

## Kryterium ukończenia

Etap jest gotowy dopiero wtedy, gdy:

- ekran wygląda spójnie z resztą aplikacji,
- nie dodaje nowych lokalnych wyjątków CSS bez uzasadnienia,
- działa w desktop i mobile,
- respektuje `prefers-reduced-motion`,
- przechodzi build/testy właściwe dla zmiany,
- nie pogarsza kompaktowości admina ani efektu wizualnego publicznej mapy.
