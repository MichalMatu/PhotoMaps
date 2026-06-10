# PhotoMaps — rekomendacje kierunku produktu v2

Data aktualizacji: 2026-06-10  
Repo: https://github.com/MichalMatu/PhotoMaps

## 0. Najkrótszy zapis kierunku

PhotoMaps nie powinno być kolejnym portalem turystycznym typu „zobacz stary budynek”. Najmocniejszy kierunek to:

> **Globalna mapa miejsc, które warto sfotografować, usłyszeć, przejść trasą i zebrać jako cyfrowe pieczątki.**

Wrocław jest pierwszą planszą startową, nie ograniczeniem produktu. Jeżeli mechanika siądzie, ten sam model można przenieść na dowolne miasto lub miejsce na świecie.

Najkrótsze hasło produktowe:

> **Idziesz, robisz zdjęcie, słuchasz klimatu, zbierasz pieczątkę i chwalisz się znajomym.**

## 1. Prostsza wersja pomysłu

Zamiast próbować opisać wszystko o miejscu, PhotoMaps ma odpowiadać na pytania, które naprawdę interesują człowieka przed wyjściem:

- czy tam będzie dobre zdjęcie/selfie,
- jaki jest klimat miejsca,
- czy ludzie faktycznie dobrze się tam bawią,
- co trzeba wiedzieć praktycznie przed pójściem,
- czy da się przejść gotową trasę,
- czy mogę zdobyć cyfrową pieczątkę,
- czy mogę zostawić swój ślad i pokazać go na FB/Instagramie.

**Budynek każdy widzi.** Przewaga PhotoMaps nie ma być w encyklopedycznym opisie budynku, tylko w pokazaniu, czy miejsce ma klimat, zdjęcia, praktyczny sens i społeczny dowód, że warto tam iść.

## 2. Główne warstwy produktu

PhotoMaps powinno mieć 6 warstw:

1. **Mapa** — światowa mapa miejsc, ale MVP zaczyna od Wrocławia.
2. **Kafelki zdjęć** — większe kafelki dla mocniejszych miejsc, mniejsze dla słabszych.
3. **Audio z miejsca** — krótkie nagrania klimatu, opinii i reakcji ludzi.
4. **Trasy z lektorem** — płatne audio-spacery prowadzące użytkownika po mapie.
5. **Pamiątki ludzi** — zdjęcia, podpisy, krótkie wspomnienia, audio.
6. **Pieczątki/tokeny** — cyfrowe potwierdzenia odwiedzin, kolekcje, odznaki i share cardy.

To razem daje nie portal, ale **mapę przeżyć**.

## 3. Warstwa zdjęć — „tu będzie dobre selfie”

Największy skrót myślowy dla użytkownika:

> „Idę tam, bo tam wyjdzie mi zajebiste zdjęcie na FB/Instagram.”

Dlatego zdjęcia nie są dodatkiem. One są głównym powodem kliknięcia miejsca.

### Jak to pokazywać

- Duże kafelki dla najlepszych miejsc.
- Mniejsze kafelki dla miejsc słabszych albo mniej sprawdzonych.
- Widoczny przykład: „takie zdjęcie możesz tam zrobić”.
- Zdjęcia ludzi i pamiątkowe zdjęcia z miejsca są równie ważne jak zdjęcia obiektu.
- Kafelki mają sprzedawać emocję, nie dokumentować budynek.

### Scoring kafelków

```text
score = jakość redakcyjna
      + jakość zdjęć
      + liczba zatwierdzonych pamiątek
      + liczba zatwierdzonych audio
      + świeżość aktywności
      + ręczne weight od admina
```

Przykład UI:

```text
score 80+  -> duży kafel / duży marker
score 40+  -> średni kafel
score <40  -> mały kafel
```

To pasuje do obecnego modelu `Place`, bo masz już `weight`, `photo_count`, `memory_count`, `cover_photo_id`, `lat`, `lon` i `status`.

## 4. Warstwa audio z miejsca — darmowa energia produktu

Najlepsza obserwacja:

> 15 sekund audio z Pasażu Niepolda w sobotni wieczór sprzeda klimat lepiej niż opis „popularne miejsce z barami”.

Audio powinno być krótkie, szybkie i emocjonalne.

### Rodzaje audio

```text
ambient      -> klimat miejsca, tło, atmosfera
visitor      -> krótka opinia/reakcja odwiedzającego
guide        -> lektor/przewodnik
practical    -> szybka wskazówka praktyczna
warning      -> ostrzeżenie, np. kolejki, remont, tłok
story        -> mini-historia miejsca
```

### Darmowe audio UGC

Bezpłatna warstwa:

```text
Idę trasą / jestem w miejscu -> nagrywam 10–30 sekund dźwięku -> dodaję do miejsca -> po moderacji inni słyszą klimat.
```

To jest paliwo społecznościowe. Użytkownik nie tylko ogląda mapę, ale zostawia żywy ślad.

### Zasada jakości

Nie chodzi o długie podcasty. Chodzi o krótkie dźwięki typu:

```text
„Jesteśmy w Pasażu Niepolda, sobota wieczór, tu jest mega klimat, przychodźcie.”
```

albo:

```text
„Afrykarium super, ale kolejka w pełnym słońcu jest długa, idź rano.”
```

## 5. Trasy z lektorem — płatny produkt premium

To jest najprostszy płatny produkt:

> **Naniesiona trasa na mapie + lektor/opis odpalany po drodze.**

Użytkownik kupuje nie sam opis, tylko doświadczenie:

```text
idę trasą -> telefon prowadzi mnie po mapie -> w odpowiednich punktach słucham lektora -> zbieram pieczątki -> kończę trasę -> udostępniam kartę przejścia.
```

### Model darmowe/płatne

| Element | Status | Sens |
|---|---|---|
| Mapa miejsc | darmowe | wejście do produktu |
| Zdjęcia/kafelki | darmowe | szybki efekt wow |
| Krótkie audio ludzi | darmowe | życie, klimat, UGC |
| Pamiątka z miejsca | darmowe/płatne | ślad użytkownika |
| Pieczątka miejsca | płatna albo freemium | monetyzacja i kolekcjonowanie |
| Trasa z lektorem | płatna | główny produkt premium |
| Kolekcja pieczątek | płatna/freemium | retencja i chwalenie się |

### Przykład trasy

```text
Nocny Wrocław
Rynek -> Neon Side -> Pasaż Niepolda -> Wyspa Słodowa -> Nadodrze

Czas: 70 minut
Miejsca: 8
Audio lektora: 14 fragmentów
Pieczątki do zebrania: 8
Cena testowa: 9–19 zł
Bonus: karta przejścia do udostępnienia
```

### Co odróżnia PhotoMaps od zwykłej aplikacji audio guide

Istnieją aplikacje z GPS audio tours, np. VoiceMap czy izi.TRAVEL. One potwierdzają, że model „idziesz i słuchasz” jest rynkowo zrozumiały. Różnica PhotoMaps powinna być taka:

```text
VoiceMap / izi.TRAVEL: audio-trasa i przewodnik.
PhotoMaps: audio-trasa + żywe audio ludzi + zdjęcia z miejsc + pamiątki + pieczątki + share na social media.
```

Czyli nie walczyć tylko jako „audio guide”, ale jako **społeczna mapa miejsc do przeżycia i zebrania**.

## 6. Pieczątki/tokeny — cyfrowa książeczka miejsc

To jest bardzo mocna mechanika, bo ma prosty analogowy wzór: książeczki turystyczne, odznaki, potwierdzenia przejść, pieczątki z miejsc.

W PhotoMaps:

```text
1 token = 1 pieczątka miejsca = np. 5 zł
```

Ale w UI lepiej nie używać słowa „token”, bo kojarzy się z krypto. Lepiej:

- pieczątka,
- żeton,
- kredyt,
- znaczek miejsca,
- wpis do książeczki,
- odznaka.

### Co kupuje użytkownik

Najprostszy produkt za 5 zł:

```text
Pieczątka miejsca + własna pamiątka + karta do udostępnienia.
```

Warianty:

| Produkt | Cena testowa | Co daje |
|---|---:|---|
| Pieczątka miejsca | 5 zł | wpis do cyfrowej książeczki miejsca |
| Pamiątka premium | 5–10 zł | zdjęcie/podpis/audio wyżej na karcie miejsca |
| Kolekcja miejsc | 15–30 zł | zestaw pieczątek, np. „Nocny Wrocław” |
| Trasa audio premium | 9–39 zł | lektor, mapa trasy, pieczątki z trasy |
| Share card premium | 5 zł | ładna karta do FB/IG bez znaku wodnego albo z lepszym stylem |

### Kolekcje pieczątek

Przykłady:

- Nocny Wrocław,
- Selfie spoty,
- Pierwszy weekend we Wrocławiu,
- Ostrów Tumski po zmroku,
- Mosty Wrocławia,
- Krasnale,
- Punkty widokowe,
- Street photo Wrocław,
- Neonowe miejsca,
- Wrocław na randkę,
- Weekend z dziećmi,
- ZOO i okolice,
- Kawiarnie z klimatem,
- Miejsca z widokiem.

Mechanika:

```text
Zdobądź 3/8 pieczątek -> pokaż postęp
Zdobądź 8/8 pieczątek -> odznaka kolekcji
Odznaka -> karta do udostępnienia
Udostępnienie -> nowi użytkownicy klikają mapę
```

## 7. Pętla viralowa

Najmocniejsza pętla:

```text
1. Widzę duży kafel miejsca na mapie.
2. Klikam, bo zdjęcia wyglądają dobrze.
3. Słucham 15 sekund audio z miejsca.
4. Idę tam, bo czuję klimat.
5. Robię zdjęcie/selfie.
6. Nagrywam krótkie audio albo dodaję pamiątkę.
7. Zdobywam pieczątkę.
8. Dostaję kartę do FB/Instagram.
9. Znajomi klikają i idą w to samo miejsce.
```

To jest dużo silniejsze niż zwykły katalog atrakcji.

### Format share card

```text
Zdobyłem pieczątkę: Pasaż Niepolda
Kolekcja: Nocny Wrocław 3/8
PhotoMaps
[ładne zdjęcie + mini mapa + odznaka + CTA]
```

albo:

```text
Przeszedłem trasę: Nocny Wrocław
8 miejsc, 70 minut, 8 pieczątek
[mapka trasy + najlepsze zdjęcie + audio icon]
```

## 8. Praktyczne informacje — nie przepisywać internetu

PhotoMaps nie musi zastępować oficjalnych stron. Może dawać:

- krótką praktyczną uwagę,
- link do oficjalnego źródła,
- ostrzeżenie od ludzi,
- audio-tip z miejsca.

Przykład:

```text
ZOO / Afrykarium

W sezonie kolejka do Afrykarium może być bardzo długa. Idź rano albo sprawdź aktualne informacje przed przyjazdem.
Link: oficjalna strona ZOO
```

To jest bardziej użyteczne niż długi opis historii budynku.

## 9. Pojedyncze miejsce — idealna karta

```text
Nazwa miejsca
Hero zdjęcie
Kafelki zdjęć ludzi
Krótki opis: dlaczego warto
Najlepsza pora: dzień / noc / weekend / po deszczu / zachód słońca
Audio klimatu 10–30 sekund
Audio ludzi 10–30 sekund
Audio przewodnika 60–180 sekund
Praktyczna wskazówka
Pieczątka miejsca
Dodaj pamiątkę
Link oficjalny
Miejsca obok
Kolekcje, do których należy
```

## 10. Minimalne MVP Wrocław

Nie robić od razu świata. Zrobić **jeden perfekcyjny pokaz**.

### Zakres startowy

```text
30–50 miejsc
3 trasy
3 kolekcje pieczątek
10 miejsc z audio klimatu
10 miejsc z audio przewodnika
każde miejsce z hero zdjęciem i kafelkami
każda pieczątka generuje share card
```

### Trasy startowe

```text
1. Nocny Wrocław
2. Pierwszy weekend we Wrocławiu
3. Najlepsze zdjęcia/selfie spoty
```

### Kolekcje startowe

```text
1. Nocny Wrocław 0/8
2. Selfie spoty 0/10
3. Wrocław pierwszy raz 0/12
```

## 11. Modele danych do dodania

### 11.1. AudioClip

```text
AudioClip
- id
- place_id nullable
- route_id nullable
- route_point_id nullable
- memory_id nullable
- author_name nullable
- author_city nullable
- kind: ambient | visitor | guide | practical | warning | story
- title
- transcript nullable
- duration_ms
- original_path
- public_path
- waveform_path nullable
- status: pending | approved | rejected | hidden
- paid: bool
- consent_confirmed: bool
- claim_token_hash nullable
- created_at
- approved_at nullable
```

### 11.2. Route

```text
Route
- id
- slug
- title
- city
- country
- description
- cover_photo_id nullable
- price_amount
- price_currency
- is_paid
- estimated_duration_min
- distance_m
- status: draft | published | hidden
- created_at
- updated_at
```

### 11.3. RoutePoint

```text
RoutePoint
- id
- route_id
- place_id nullable
- sort_order
- lat
- lon
- title
- instruction_text nullable
- trigger_radius_m
- narrator_audio_id nullable
- stamp_available: bool
```

### 11.4. PlaceStamp

```text
PlaceStamp
- id
- place_id
- route_id nullable
- collection_id nullable
- user_id nullable
- anonymous_session_id nullable
- memory_id nullable
- display_name
- city nullable
- paid
- payment_id nullable
- share_slug
- status: active | hidden | refunded
- created_at
```

### 11.5. Collection

```text
Collection
- id
- slug
- title
- description
- city nullable
- country nullable
- cover_image
- status: draft | published | hidden
```

### 11.6. CollectionPlace

```text
CollectionPlace
- collection_id
- place_id
- sort_order
```

### 11.7. UserCollectionProgress

```text
UserCollectionProgress
- id
- user_id nullable
- anonymous_session_id nullable
- collection_id
- stamps_count
- completed_at nullable
```

### 11.8. ShareCard

```text
ShareCard
- id
- type: place_stamp | route_completed | collection_badge | memory
- owner_id nullable
- image_path
- share_slug
- created_at
```

## 12. API — nie przeładować mapy

Mapa musi być lekka. Nie ładować wszystkich zdjęć, pamiątek i audio na starcie.

```text
GET /api/map/places
-> id, slug, title, lat, lon, score, category, cover_thumb, counts

GET /api/places/{slug}
-> opis, local_comment, tip, linki oficjalne, score, kolekcje

GET /api/places/{slug}/media
-> zdjęcia, pamiątki, audio

GET /api/places/{slug}/audio
-> krótkie audio, audio guide, audio tipy

POST /api/places/{slug}/audio
-> dodaj audio z miejsca, status pending

POST /api/places/{slug}/stamp
-> kup/dodaj pieczątkę

GET /api/routes
-> lista tras

GET /api/routes/{slug}
-> trasa, punkty, cena, status dostępu

POST /api/routes/{slug}/start
-> start trasy / aktywacja zakupu

POST /api/routes/{slug}/complete
-> zakończ trasę, wygeneruj share card
```

## 13. UX trasy

Trasa premium powinna działać tak:

```text
1. Użytkownik wybiera trasę.
2. Widzi cenę, czas, dystans, liczbę miejsc i pieczątek.
3. Kupuje lub startuje darmowy fragment demo.
4. Mapa prowadzi go punkt po punkcie.
5. W punkcie odpala się audio lektora.
6. Może odsłuchać audio ludzi z miejsca.
7. Może zdobyć pieczątkę.
8. Po końcu dostaje kartę przejścia.
```

Demo powinno być darmowe:

```text
Pierwszy punkt trasy za darmo.
Reszta po zakupie.
```

## 14. Moderacja, prawa i bezpieczeństwo audio

Audio jest mocne, ale trzeba je zabezpieczyć.

### Zasada podstawowa

Publikować tylko audio, do którego użytkownik ma prawa i które nie łamie prywatności innych.

Preferowane:

- użytkownik nagrywa siebie,
- ambient bez zrozumiałych prywatnych rozmów,
- wypowiedź osób, które się zgodziły,
- krótkie audio z miejsca bez danych osobowych,
- moderacja przed publikacją.

Ryzykowne:

- podsłuchane rozmowy obcych osób,
- głosy dzieci,
- nagrania z prywatnych lokali bez zgody,
- muzyka z klubu/koncertu chroniona prawem autorskim,
- nagrania zawierające dane osobowe,
- długie rozmowy przypadkowych ludzi.

### Checkbox przed uploadem

```text
Potwierdzam, że mam prawo opublikować to nagranie, a audio nie zawiera prywatnych rozmów ani rozpoznawalnych osób bez ich zgody.
```

### Status audio

```text
pending -> approved -> public
pending -> rejected
public -> hidden po zgłoszeniu
```

## 15. Monetyzacja — prosty model

Najpierw darmowa mapa i darmowe UGC, potem płatne elementy premium.

### Darmowe

- mapa,
- zdjęcia,
- część audio ludzi,
- podstawowe informacje,
- dodanie pamiątki po moderacji,
- jeden darmowy stamp testowy,
- demo trasy.

### Płatne

- trasy z lektorem,
- pieczątki miejsc,
- kolekcje pieczątek,
- pamiątka premium,
- share card premium,
- pakiety miejskie.

### Test cen

```text
Pieczątka miejsca: 5 zł
Trasa audio: 9–19 zł
Pakiet 3 tras: 29–39 zł
Kolekcja premium: 15–30 zł
Pamiątka premium: 5–10 zł
```

## 16. SEO i wejścia z Google

Nie walczyć od razu o ogólne frazy typu „Wrocław atrakcje”. Tam konkurencja będzie mocna.

Celować w frazy, które pasują do produktu:

```text
najlepsze miejsca na zdjęcie we Wrocławiu
selfie spoty Wrocław
nocny Wrocław gdzie iść
Pasaż Niepolda klimat
Wrocław miejsca z neonami
Wrocław na randkę mapa
Wrocław audio przewodnik
Wrocław trasa audio
Wrocław cyfrowe pieczątki
miejsca z klimatem Wrocław
```

Każde miejsce, trasa i kolekcja powinny mieć publiczny adres:

```text
/miejsca/pasaz-niepolda
/miejsca/ostrow-tumski
/trasy/nocny-wroclaw
/kolekcje/selfie-spoty-wroclaw
/pieczatki/pasaz-niepolda/{share_slug}
```

## 17. Najważniejsza kolejność prac

1. Dodać jasne pozycjonowanie w README: mapa zdjęć, audio, tras i pieczątek.
2. Odchudzić endpoint mapy.
3. Dodać `AudioClip`.
4. Dodać prosty upload audio z moderacją.
5. Dodać `Route` i `RoutePoint`.
6. Dodać jedną trasę demo.
7. Dodać `PlaceStamp`.
8. Dodać share card dla pieczątki.
9. Dodać 3 kolekcje startowe.
10. Dopiero potem płatności.

## 18. Co można wpisać agentowi/koderowi

```text
Projekt PhotoMaps ma iść w kierunku globalnej mapy miejsc do zdjęć, audio, tras i cyfrowych pieczątek. Wrocław jest pierwszą planszą startową. Nie budujemy suchego portalu turystycznego, tylko mapę przeżyć: zdjęcia pokazują, gdzie będzie dobre selfie; krótkie audio z miejsca oddaje klimat; płatne trasy z lektorem prowadzą użytkownika po mapie; pieczątki/tokeny pozwalają zbierać miejsca i chwalić się kartami na FB/Instagram.

Najbliższe prace:
1. dodać model AudioClip i upload krótkiego audio z moderacją,
2. dodać model Route i RoutePoint dla tras z lektorem,
3. dodać model PlaceStamp jako cyfrową pieczątkę miejsca,
4. dodać Collection dla zestawów miejsc,
5. dodać ShareCard dla kart do udostępniania,
6. utrzymać lekki endpoint mapy: tylko metadane, score, cover_thumb i counts,
7. szczegóły zdjęć/audio/pamiątek ładować dopiero po kliknięciu miejsca.
```

## 19. Jednozdaniowa wizja

> **PhotoMaps to globalna mapa miejsc z klimatem, gdzie ludzie odkrywają dobre spoty do zdjęć, słuchają audio z miejsca, idą płatnymi trasami z lektorem, zostawiają pamiątki i zbierają cyfrowe pieczątki, którymi mogą się chwalić.**

## 20. Hasła do testowania

```text
Zbieraj miejsca, nie tylko zdjęcia.
```

```text
Mapa miejsc, które mają klimat.
```

```text
Idź trasą, słuchaj miasta, zbieraj pieczątki.
```

```text
Tu zrobisz zdjęcie, usłyszysz miejsce i zdobędziesz pieczątkę.
```

```text
Twoja cyfrowa książeczka miejsc.
```

```text
Zdobądź pieczątkę z miejsca i pokaż ją znajomym.
```

## 21. Referencje i inspiracje

### Trasy audio i GPS audio

- VoiceMap — self-guided audio tours, automatyczne odtwarzanie przez GPS: https://voicemap.me/
- VoiceMap App Store — GPS audio walks/drives/boat rides w wielu destynacjach: https://apps.apple.com/nl/app/voicemap-audio-tours-guides/id852027939?l=en-GB
- izi.TRAVEL — audio guides, Free Walking Mode, GPS auto-play: https://play.google.com/store/apps/details?id=travel.opas.client

### Pieczątki, odznaki, kolekcjonowanie

- PTTK GOT — potwierdzenia w książeczce i tradycja potwierdzania wycieczek: https://ktg.pttk.pl/g%C3%B3rska-odznaka-turystyczna/regulamin-got-pttk
- PDF regulaminu GOT — zapis o zbieraniu potwierdzeń/pieczątek: https://www.msw-pttk.org.pl/odznaki/reg_odznak/pdf/got.pdf
- Geocaching — souvenirs/badges jako wirtualne rzeczy do zdobywania, kolekcjonowania i pokazywania: https://www.geocaching.com/blog/2016/10/whats-the-difference-between-geocaching-souvenirs-badges-and-trackable-icons/

### Prywatność audio

- UODO — rejestracja dźwięku wymaga podstawy prawnej, przykład naruszenia przy nagrywaniu głosu: https://uodo.gov.pl/pl/138/2449

### Obecne repo

- PhotoMaps repo: https://github.com/MichalMatu/PhotoMaps
- Model `Place`: https://raw.githubusercontent.com/MichalMatu/PhotoMaps/main/backend/app/models/place.py
- Model `Memory`: https://raw.githubusercontent.com/MichalMatu/PhotoMaps/main/backend/app/models/memory.py

## 22. Rekomendacja końcowa

Najmocniejsza wersja projektu to nie „lepszy przewodnik turystyczny”.

Najmocniejsza wersja to:

```text
Instagramowe spoty + audio klimat + płatne trasy z lektorem + cyfrowa książeczka pieczątek + pamiątki ludzi + mapa.
```

To jest prostsze, bardziej wiralowe i łatwiejsze do skalowania globalnie niż klasyczny katalog atrakcji.
