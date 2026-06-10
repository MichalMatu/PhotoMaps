# Prompt dla agenta: etapowa przebudowa WreckScanner w lokalny przewodnik po Wrocławiu

Jesteś agentem programistycznym. Pracujesz na kopii repozytorium WreckScanner.

Twoim zadaniem jest etapowa przebudowa starej aplikacji o wrakach w nową aplikację:

> Lokalny przewodnik po Wrocławiu bez sieciówek, z miejscami z charakterem, zdjęciami, pamiątkami użytkowników i architekturą gotową pod przyszłe audio, historię i przewodniki.

Nie próbuj wdrażać całej wizji naraz.

Najważniejszy cel:

> Zbudować prosty, działający szkielet: places + categories + mapa + zdjęcia/pamiątki + SQLite.

---

## Kontekst starego projektu

Stary projekt WreckScanner dotyczy:

- wraków,
- YOLO,
- skanowania mapy,
- kandydatów,
- zgłoszeń,
- raportów,
- teczek wraków,
- zdjęć terenowych.

Nowy projekt NIE jest o wrakach.

Nowy projekt jest o miejscach we Wrocławiu.

---

## Kontekst nowego produktu

Nowa aplikacja ma być lokalnym przewodnikiem po Wrocławiu.

Główne założenia produktu:

- nie konkurujemy z Google Maps jako katalog wszystkiego,
- nie pokazujemy wielkich sieciówek,
- nie sprzedajemy pozycji w rankingu,
- pokazujemy miejsca z charakterem,
- miejsca wybierane są kuratorsko/lokalnie,
- użytkownicy mogą dodawać zdjęcia i pamiątki „byłem tutaj”,
- w przyszłości mogą dojść audio, historia, trasy, języki i płatności.

Nie dodajemy:

- McDonald’s,
- KFC,
- Starbucks,
- Costa,
- wielkich sieciówek,
- galerii handlowych jako atrakcji,
- franczyz bez lokalnego charakteru.

Dodajemy:

- bary mleczne,
- lokalne jedzenie,
- małe kawiarnie,
- street food,
- murale,
- podwórka,
- neony,
- punkty widokowe,
- miejsca z historią,
- hidden gems,
- lokalne klasyki,
- miejsca warte pokazania znajomym spoza miasta.

---

## Najważniejsza zasada architektury

Głównym bytem jest:

> place — miejsce

Wszystko inne jest warstwą przypiętą do miejsca.

Docelowy model myślenia:

```txt
place
 ├── category
 ├── photos
 ├── memories
 ├── guides
 ├── audio_items          przyszłość
 ├── historical_items     przyszłość
 ├── reports
 └── future_layers
```

Nie twórz osobnych światów dla zdjęć, pamiątek, audio, historii i przewodników.

Każda nowa funkcja ma być warstwą miejsca.

---

## Co zachować z obecnego kodu

W miarę możliwości wykorzystaj istniejące elementy:

- mapę Leaflet,
- pinezki,
- popupy,
- upload zdjęć,
- generowanie miniatur,
- usuwanie/anonimizację EXIF,
- rozdzielenie prywatnych oryginałów od publicznych kopii,
- panel admina,
- statusy typu pending/approved,
- logikę public/private dla zdjęć,
- część UI mapy, jeśli da się ją bezpiecznie przepisać.

Nie przepisuj wszystkiego od zera, jeśli obecne mechanizmy działają.

---

## Co ukryć albo usunąć z głównego flow

Odłącz od nowego produktu:

- YOLO,
- skanowanie obszaru,
- kandydatów wraków,
- score wraka,
- raporty zgłoszeniowe,
- PDF/ZIP zgłoszeń,
- słownictwo: wrak, wreck, pojazd, candidate, scan, YOLO.

Nie musisz usuwać starego kodu fizycznie w pierwszym etapie.

Najpierw:
1. ukryj go z UI,
2. przestań używać go w głównym flow,
3. potem czyść kod etapami.

---

## Zakaz na start

W pierwszych etapach NIE wdrażaj:

- płatności,
- audio GPS,
- audio-wspomnień,
- warstwy historycznej,
- wielojęzyczności,
- paszportu/pieczątek,
- kont użytkowników,
- pełnych tras audio,
- zaawansowanego SEO,
- rozbudowanego systemu rankingowego.

Architektura może przewidywać te rzeczy, ale nie implementuj ich w pierwszym MVP.

---

# ETAP 0 — analiza repozytorium

Najpierw przejrzyj repozytorium.

Zidentyfikuj pliki odpowiedzialne za:

- backend/API,
- mapę,
- upload zdjęć,
- miniatury,
- anonimizację EXIF,
- admin panel,
- aktualne modele danych,
- katalogi z zapisanymi wrakami i zdjęciami terenowymi,
- frontend JS/CSS/HTML.

Po analizie wypisz krótko:

1. które pliki zostaną wykorzystane,
2. które pliki są legacy,
3. które pliki trzeba zmienić w etapie 1,
4. gdzie najlepiej dodać SQLite.

Nie koduj jeszcze dużych zmian przed tą analizą.

---

# ETAP 1 — SQLite i podstawowy model places

Cel etapu:

> Dodać bazę SQLite i podstawowy model miejsc.

Dodaj SQLite jako główne źródło metadanych nowej aplikacji.

Na tym etapie dodaj minimum:

## Tabela places

```sql
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  local_comment TEXT,
  category_id TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  weight REAL DEFAULT 1.0,
  status TEXT DEFAULT 'draft',
  is_chain INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,
  memory_count INTEGER DEFAULT 0,
  cover_photo_id TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

## Tabela categories

```sql
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);
```

Dodaj podstawowe kategorie startowe:

- bar_mleczny,
- street_food,
- coffee,
- viewpoint,
- mural,
- hidden_gem,
- cheap_food,
- date_spot,
- rainy_day,
- after_22,
- local_classic.

Wymagania:

- dodaj warstwę dostępu do bazy,
- dodaj inicjalizację bazy przy starcie aplikacji,
- nie usuwaj jeszcze starego systemu plików,
- nie migruj wszystkiego naraz.

Po etapie 1 sprawdź:

- aplikacja uruchamia się,
- baza SQLite się tworzy,
- kategorie są dostępne,
- nie zepsułeś istniejącego startu aplikacji.

---

# ETAP 2 — API places i categories

Cel etapu:

> Stworzyć nowe API dla miejsc i kategorii.

Dodaj endpointy MVP:

## Publiczne

```txt
GET /api/places
GET /api/places/:id
GET /api/categories
```

## Admin

```txt
POST /api/admin/places
PATCH /api/admin/places/:id
DELETE /api/admin/places/:id
```

GET /api/places powinno zwracać lekkie dane na mapę:

- id,
- slug,
- title,
- lat,
- lon,
- category_id,
- category label/icon,
- weight,
- photo_count,
- memory_count,
- cover thumb jeśli istnieje,
- score.

Nie zwracaj wszystkich zdjęć w liście miejsc.

Obsłuż podstawowe filtry:

- status,
- category,
- bbox, jeśli łatwo dodać.

DELETE może na start oznaczać archiwizację, nie fizyczne usuwanie.

Po etapie 2 sprawdź:

- można pobrać listę kategorii,
- można dodać miejsce przez API,
- można edytować miejsce,
- można pobrać listę miejsc,
- stare API nie musi być jeszcze usunięte, ale nowe działa.

---

# ETAP 3 — mapa pokazuje places zamiast wraków

Cel etapu:

> Nowa mapa ma renderować places jako główne pinezki.

Na froncie:

- odłącz główny widok od savedWrecks/candidates jako podstawowego źródła,
- dodaj ładowanie /api/places,
- renderuj jedną pinezkę na jedno miejsce,
- popup ma pokazywać:
  - nazwę,
  - kategorię,
  - krótki opis/local_comment,
  - liczbę zdjęć,
  - liczbę pamiątek,
  - status/etykietę, jeśli przydatne.

Na tym etapie nie pokazuj zdjęć jako osobnych pinezek.

Zasada:

> jedna pinezka = jedno miejsce

Nie rób:

> jedna pinezka = jedno zdjęcie

Po etapie 3 sprawdź:

- admin może dodać miejsce,
- miejsce pojawia się na mapie,
- zmiana kategorii wpływa na wygląd/tekst pinezki,
- UI nie mówi już użytkownikowi o wrakach w głównym flow.

---

# ETAP 4 — prosty admin do dodawania i edycji miejsca

Cel etapu:

> Admin może używać aplikacji bez ręcznego API.

Dodaj albo przerób formularz admina:

Pola:

- title,
- category,
- lat,
- lon,
- description,
- local_comment,
- weight,
- status,
- is_chain.

Admin powinien móc:

- kliknąć na mapie i utworzyć miejsce,
- edytować istniejące miejsce,
- ustawić wagę,
- opublikować/ukryć miejsce.

Nie dodawaj jeszcze skomplikowanych ról użytkowników.

Po etapie 4 sprawdź:

- można dodać miejsce z UI,
- można je opublikować,
- publiczna mapa widzi tylko published,
- drafty są widoczne tylko adminowi.

---

# ETAP 5 — zdjęcia miejsca

Cel etapu:

> Dodać zdjęcia przypięte do miejsca.

Dodaj tabelę photos:

```sql
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL,
  original_path TEXT,
  public_path TEXT,
  thumb_path TEXT,
  status TEXT DEFAULT 'pending',
  caption TEXT,
  created_at TEXT,
  approved_at TEXT
);
```

Endpointy:

```txt
GET /api/places/:id/photos
POST /api/places/:id/photos
POST /api/admin/photos/:id/review
```

Wymagania:

- zdjęcia należą do place_id,
- upload tworzy prywatny oryginał,
- publiczna kopia nie ma EXIF,
- generuj miniaturę,
- status domyślny: pending,
- publicznie pokazuj tylko approved,
- admin może approve/reject,
- aktualizuj photo_count po zatwierdzeniu/usunięciu.

Jeżeli obecny kod field_photos już robi upload, EXIF i miniatury, wykorzystaj go, ale zmień domenę na photos/place photos.

Po etapie 5 sprawdź:

- można dodać zdjęcie do miejsca,
- zdjęcie trafia do pending,
- admin może zatwierdzić,
- publicznie widoczne są tylko approved,
- EXIF nie trafia do publicznej wersji.

---

# ETAP 6 — pamiątki „byłem tutaj”

Cel etapu:

> Dodać prostą pamiątkę użytkownika przy miejscu.

Na tym etapie pamiątka to:

- zdjęcie,
- podpis,
- imię/pseudonim,
- miasto/kraj opcjonalnie,
- status moderacji.

Nie dodawaj jeszcze audio.

Dodaj tabelę memories:

```sql
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL,
  author_name TEXT,
  author_city TEXT,
  caption TEXT,
  original_path TEXT,
  public_path TEXT,
  thumb_path TEXT,
  status TEXT DEFAULT 'pending',
  paid INTEGER DEFAULT 0,
  share_slug TEXT UNIQUE,
  created_at TEXT,
  approved_at TEXT
);
```

Endpointy:

```txt
GET /api/places/:id/memories
POST /api/places/:id/memories
POST /api/admin/memories/:id/review
```

Wymagania:

- memory należy do place_id,
- domyślnie pending,
- publicznie tylko approved,
- generuj share_slug,
- audio zostaw na później,
- paid zostaw jako pole na przyszłość, ale bez płatności.

Po etapie 6 sprawdź:

- można dodać pamiątkę do miejsca,
- admin może ją zatwierdzić,
- licznik memory_count się aktualizuje,
- pamiątki są widoczne przy miejscu.

---

# ETAP 7 — podstawowy ranking

Cel etapu:

> Dodać prosty ranking bez płatnych promocji.

Ranking startowy:

```txt
score = (photo_count + memory_count * 2) * weight
```

Wymagania:

- ranking ma być funkcją/helperem, łatwą do zmiany,
- lokale nie mogą kupić pozycji,
- is_chain powinno pozwalać ukrywać/odrzucać sieciówki,
- w UI nie pokazuj technicznego słowa „weight”.

W UI używaj:

- polecane przez lokalsów,
- hidden gem,
- lokalny klasyk,
- popularne wśród odwiedzających,
- najwięcej wspomnień.

Po etapie 7 sprawdź:

- miejsca sortują się po score,
- zmiana weight wpływa na pozycję,
- liczba zdjęć/pamiątek wpływa na pozycję,
- nie ma płatnego boosta.

---

# ETAP 8 — przewodniki jako kolekcje miejsc

Cel etapu:

> Dodać guides, ale bez rozbudowanej logiki tras/audio.

Dodaj tabele:

```sql
CREATE TABLE IF NOT EXISTS guides (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT,
  updated_at TEXT
);
```

```sql
CREATE TABLE IF NOT EXISTS place_guides (
  place_id TEXT NOT NULL,
  guide_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (place_id, guide_id)
);
```

Endpointy:

```txt
GET /api/guides
GET /api/guides/:slug
POST /api/admin/guides
PATCH /api/admin/guides/:id
POST /api/admin/guides/:id/places
DELETE /api/admin/guides/:id/places/:place_id
```

Przykładowe przewodniki:

- Wrocław za 30 zł,
- Bary mleczne z klimatem,
- Wrocław w deszczowy dzień,
- Spacer bez tłumów,
- Miejsca na randkę bez spiny,
- Street food po spacerze,
- Ukryte podwórka.

Po etapie 8 sprawdź:

- miejsce może należeć do wielu przewodników,
- przewodnik pokazuje listę miejsc,
- kolejność w przewodniku może być ustawiona ręcznie.

---

# ETAP 9 — raporty jakości

Cel etapu:

> Dodać prosty mechanizm zgłaszania problemów.

Dodaj tabelę reports:

```sql
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  message TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT
);
```

Endpoint:

```txt
POST /api/reports
GET /api/admin/reports
PATCH /api/admin/reports/:id
```

Powody:

- miejsce zamknięte,
- ceny wzrosły,
- klimat zniknął,
- miejsce zrobiło się zbyt turystyczne,
- dane nieaktualne,
- naruszenie zdjęcia/pamiątki,
- inne.

Po etapie 9 sprawdź:

- użytkownik może zgłosić problem,
- admin widzi zgłoszenia,
- admin może oznaczyć zgłoszenie jako zamknięte.

---

# ETAPY PÓŹNIEJSZE — nie implementować teraz

Dopiero po działającym MVP można wracać do tych funkcji:

## Audio-wspomnienia

- audio do memories,
- max 30 sekund,
- moderacja,
- publicznie tylko approved,
- brak video.

## Audio-przewodnik GPS

- audio_items przypięte do place_id,
- wersje językowe,
- odtwarzanie według lokalizacji,
- trasy audio.

## Warstwa historyczna

- historical_items przypięte do place_id,
- archiwalne zdjęcia,
- opisy „kiedyś i dziś”,
- źródła/licencje,
- porównania dawniej/teraz.

## Paszport / pieczątki

- cyfrowe pieczątki,
- ukończone trasy,
- odwiedzone miejsca.

## Płatności

- pamiątki premium,
- audio-przewodniki premium,
- bez kupowania rankingu miejsc.

Nie implementuj tych funkcji, dopóki etapy 1–8 nie działają stabilnie.

---

## Nazewnictwo

Zmieniaj nazwy domenowe konsekwentnie.

Stare → nowe:

```txt
wreck              → place
wrecks             → places
savedWreck         → place
fieldPhoto         → photo albo memory
issueType          → category
candidate          → legacy / usuń z nowego UI
zidentyfikowane_wraki → places
zdjecia_terenowe      → photos albo memories
```

W nowym UI nie może być słów:

- wrak,
- wreck,
- pojazd,
- candidate,
- YOLO,
- scan,
- score wraka.

Legacy może tymczasowo zostać w kodzie, ale nie w produkcie.

---

## Zasady bezpieczeństwa i prywatności zdjęć

Dla zdjęć i pamiątek:

- publiczna kopia zawsze bez EXIF,
- publiczne API nigdy nie zwraca prywatnego oryginału,
- oryginały przechowuj tylko prywatnie,
- wszystko od użytkownika domyślnie pending,
- publikuj tylko approved,
- dodaj możliwość reject,
- dodaj możliwość report.

Nie zakładaj, że użytkownik ma prawo do każdej osoby widocznej na zdjęciu.

W UI/formularzu dodaj zgodę:

```txt
Potwierdzam, że jestem autorem zdjęcia albo mam prawo je opublikować.
Jeśli na zdjęciu są rozpoznawalne osoby jako główny temat, mam ich zgodę.
Nie dodaję zdjęć obcych osób bez zgody.
```

---

## Testowanie po każdym etapie

Po każdym etapie wykonaj minimalne testy:

1. aplikacja się uruchamia,
2. frontend się ładuje,
3. mapa działa,
4. nowe endpointy odpowiadają,
5. nie ma błędów w konsoli,
6. stary kod legacy nie blokuje nowego flow,
7. dane zapisują się w SQLite,
8. publiczne treści nie pokazują pending.

Nie przechodź do kolejnego etapu, jeśli obecny etap nie działa.

---

## Definicja sukcesu MVP

MVP jest gotowe, gdy:

- admin może dodać miejsce,
- miejsce ma kategorię,
- miejsce pojawia się na mapie,
- miejsce ma opis i lokalny komentarz,
- można dodać zdjęcie do miejsca,
- można dodać pamiątkę do miejsca,
- zdjęcia i pamiątki przechodzą moderację,
- publicznie widać tylko approved,
- ranking korzysta z liczby zdjęć/pamiątek i weight,
- UI nie wygląda już jak WreckScanner,
- nie ma głównego flow z wrakami, YOLO ani kandydatami.

---

## Najważniejsze polecenie

Pracuj etapami.

Nie rób wszystkiego naraz.

Najpierw:

```txt
SQLite → places → categories → mapa → admin → photos → memories → ranking → guides
```

Dopiero potem:

```txt
audio → historia → płatności → paszport → wielojęzyczność
```

Najważniejsza zasada:

> Miejsce jest centrum systemu. Wszystko inne jest warstwą przypiętą do miejsca.
