# PhotoMaps — poglądowe rekomendacje kierunku produktu

Data: 2026-06-10  
Repo: https://github.com/MichalMatu/PhotoMaps

## 1. Najprostsza wersja pomysłu

Nie budować kolejnego portalu turystycznego typu „tu jest stary budynek, zobacz opis”.

Budować **globalną mapę miejsc, gdzie warto zrobić zdjęcie, posłuchać klimatu i zdobywać cyfrowe pieczątki**.

Najkrótsze pozycjonowanie:

> **Mapa miejsc z klimatem: zdjęcia, krótkie audio z miejsca, pamiątki ludzi i cyfrowe pieczątki do kolekcjonowania.**

Wrocław nie musi być docelowym ograniczeniem. Wrocław może być pierwszym miastem startowym, czyli „planszą pokazową”, na której dopracowujesz jakość miejsc, UI, audio, tokeny i mechanikę wiralową.

## 2. Dlaczego to jest mocniejsze niż zwykły przewodnik

Klasyczne strony turystyczne odpowiadają na pytanie:

> Co to jest za budynek i gdzie się znajduje?

PhotoMaps powinno odpowiadać na inne pytania:

> Czy tam będzie fajne zdjęcie?
> Czy tam jest klimat?
> Czy ludzie naprawdę się tam dobrze bawią?
> Co warto wiedzieć przed pójściem?
> Czy mogę zostawić tam swój ślad?
> Czy mogę zebrać pieczątkę z tego miejsca i pochwalić się nią?

Budynek każdy widzi. Przewaga ma być w tym, czego zwykły opis nie oddaje:

- jak wygląda zdjęcie z tego miejsca,
- jaki jest klimat w danej porze dnia,
- co mówią ludzie, którzy właśnie tam byli,
- czy miejsce nadaje się na selfie / Instagrama / Facebooka,
- co trzeba wiedzieć praktycznie, zanim się tam pójdzie,
- czy miejsce należy do jakiejś kolekcji / trasy / wyzwania.

## 3. Rdzeń produktu

PhotoMaps powinien mieć 4 warstwy:

### 3.1. Warstwa wizualna — „tu zrobisz dobre zdjęcie”

Każde miejsce powinno mieć kafelki zdjęć. Lepsze miejsca mają większe kafelki, słabsze mniejsze.

To można oprzeć o scoring:

```text
score = jakość redakcyjna + liczba dobrych zdjęć + liczba pamiątek + liczba audio + świeżość aktywności
```

W UI:

```text
wysoki score  -> duży kafel / duży marker
średni score  -> normalny kafel
niski score   -> mały kafel
```

Użytkownik nie musi czytać 20 opisów. Mapa sama pokazuje, gdzie jest „wow”.

### 3.2. Warstwa audio — „usłysz klimat miejsca”

Najmocniejsza funkcja: krótkie audio z miejsca.

Przykład:

> Klikasz Pasaż Niepolda w sobotni wieczór, rozwijają się kafelki, odpalasz 15 sekund audio: ludzie się bawią, ktoś mówi „tu jest zajebiście, przychodźcie”.

To jest bardziej przekonujące niż opis „popularne miejsce z barami”.

Typy audio:

- **audio klimatu** — 10–30 sekund z miejsca,
- **audio opinii** — krótka wypowiedź odwiedzającego,
- **audio przewodnika** — 60–180 sekund, bardziej redakcyjne,
- **audio praktyczne** — „uważaj, w sezonie kolejka do Afrykarium/Oceanarium może być bardzo długa”.

### 3.3. Warstwa pamiątek — „zostaw ślad”

To już masz w kierunku `Memory`: zdjęcie, podpis, tekst, autor, status, płatność, share slug, zgoda.

Pamiątka z miejsca może być:

- zdjęciem,
- krótkim opisem,
- podpisem,
- audio,
- pieczątką z miejsca.

To jest bardziej emocjonalne niż zwykły komentarz.

### 3.4. Warstwa pieczątek/tokenów — „zbieraj miejsca”

To może być najprostszy mechanizm retencji i monetyzacji.

Stary analogowy wzór: książeczki turystyczne, pieczątki, odznaki, potwierdzenia odwiedzin.

Nowa wersja:

```text
1 token = 1 pieczątka miejsca = np. 5 zł
```

Użytkownik może:

- zdobyć pieczątkę miejsca,
- dodać zdjęcie/pamiątkę do pieczątki,
- połączyć pieczątki w kolekcję,
- zdobywać odznaki za trasy i zestawy miejsc,
- udostępniać kartę kolekcji na Facebooku/Instagramie.

To tworzy prostą pętlę:

```text
idę w miejsce -> robię zdjęcie -> dodaję pamiątkę -> zdobywam pieczątkę -> udostępniam -> inni klikają mapę -> idą w to miejsce
```

## 4. Najważniejsza zmiana strategiczna

Nie zaczynać od hasła:

> „Przewodnik po Wrocławiu”

Lepsze hasło:

> **„Zbieraj miejsca. Rób zdjęcia. Słuchaj klimatu miasta.”**

Albo:

> **„Mapa miejsc, do których idziesz po zdjęcie, klimat i cyfrową pieczątkę.”**

To jest prostsze, bardziej globalne i mniej ogranicza projekt.

## 5. Jak wygląda pojedyncze miejsce

Każde miejsce powinno mieć prostą kartę:

```text
Nazwa miejsca
Duże hero zdjęcie
Kafelki zdjęć ludzi
Krótki opis: dlaczego warto
Audio klimatu 15–30 sekund
Audio przewodnika 60–180 sekund
Praktyczna wskazówka
Przycisk: Zdobądź pieczątkę
Przycisk: Dodaj pamiątkę
Link do oficjalnych informacji / strony miejsca
```

Przykład dla ZOO/Afrykarium:

```text
Warto wiedzieć:
W sezonie kolejka do Afrykarium może być bardzo długa. Sprawdź godziny, bilety i komunikaty na oficjalnej stronie przed przyjazdem.
```

Czyli PhotoMaps nie musi przepisywać całej oficjalnej informacji. Może dawać:

- klimat,
- zdjęcia,
- ludzi,
- krótkie praktyczne ostrzeżenie,
- link do oficjalnego źródła.

## 6. Model tokenów i pieczątek

### 6.1. Nie nazywać tego krypto

Lepiej unikać skojarzenia z kryptowalutą.

Zamiast „token” w UI:

- kredyt,
- żeton,
- pieczątka,
- odznaka,
- wpis do książeczki,
- znaczek miejsca.

Technicznie możesz mieć `token`, ale użytkownik powinien widzieć prostszy język:

```text
Kup pieczątkę miejsca — 5 zł
```

### 6.2. Co użytkownik kupuje za 5 zł

Najprostszy produkt:

```text
Pieczątka miejsca + możliwość dodania pamiątki + karta do udostępnienia
```

Warianty:

| Produkt | Cena testowa | Co daje |
|---|---:|---|
| Pieczątka miejsca | 5 zł | wpis w cyfrowej książeczce miejsca |
| Pamiątka premium | 5–10 zł | zdjęcie/podpis/audio widoczne wyżej |
| Kolekcja miejsc | 15–30 zł | zestaw pieczątek, np. „Nocny Wrocław” |
| Trasa audio premium | 19–39 zł | przewodnik audio + pieczątki z trasy |

### 6.3. Kolekcje i odznaki

Przykłady kolekcji:

- Nocny Wrocław,
- Najlepsze selfie spoty,
- Wrocław na randkę,
- Ostrów Tumski po zmroku,
- Mosty Wrocławia,
- Krasnale,
- Punkty widokowe,
- Street photo Wrocław,
- Miejsca z neonami,
- Weekend z dziećmi.

Mechanika:

```text
Zdobądź 5/10 pieczątek z kolekcji -> dostajesz odznakę -> generujesz kartę do udostępnienia.
```

## 7. Wiralowość

Najważniejszy format udostępniania:

```text
Karta miejsca / karta kolekcji
```

Powinna wyglądać dobrze jako obraz na FB/Instagram/Stories.

Przykład:

```text
Zdobyłem pieczątkę: Pasaż Niepolda
Moja kolekcja: Nocny Wrocław 3/10
PhotoMaps
[ładne zdjęcie + mała mapa + odznaka]
```

To ma działać jak cyfrowa wersja:

- pieczątki w książeczce turystycznej,
- odznaki PTTK,
- geocaching souvenirs,
- achievement w grze,
- pocztówka z miejsca.

## 8. Minimalne MVP

Nie robić od razu świata.

Zrobić jeden mocny pokaz na Wrocławiu:

```text
30–50 miejsc
każde miejsce ma świetne zdjęcia
10–20 miejsc ma audio klimatu
10 miejsc ma audio przewodnika
każde miejsce ma przycisk „Zdobądź pieczątkę”
każda pieczątka generuje kartę share
3 kolekcje startowe
```

Proponowane kolekcje startowe:

```text
Nocny Wrocław
Selfie spoty
Pierwszy weekend we Wrocławiu
```

## 9. Co dodać w kodzie jako następne

### 9.1. AudioClip

```text
AudioClip
- id
- place_id
- author_name
- author_city
- kind: ambient | visitor | guide | tip
- title
- transcript
- duration_ms
- original_path
- public_path
- waveform_path
- status: pending | approved | rejected
- consent_confirmed
- claim_token_hash
- created_at
- approved_at
```

### 9.2. Stamp / PlaceStamp

```text
PlaceStamp
- id
- place_id
- user_id nullable
- memory_id nullable
- display_name
- city
- paid
- payment_id nullable
- share_slug
- status: active | hidden | refunded
- created_at
```

### 9.3. Collection

```text
Collection
- id
- slug
- title
- description
- cover_image
- status
```

### 9.4. CollectionPlace

```text
CollectionPlace
- collection_id
- place_id
- sort_order
```

### 9.5. UserCollectionProgress

```text
UserCollectionProgress
- id
- user_id nullable
- anonymous_session_id nullable
- collection_id
- stamps_count
- completed_at nullable
```

### 9.6. ShareCard

```text
ShareCard
- id
- type: place_stamp | collection_badge | memory
- owner_id nullable
- image_path
- share_slug
- created_at
```

## 10. API — nie przeładować mapy

Mapa powinna być lekka.

Nie zwracać wszystkich zdjęć, pamiątek i audio od razu na `/api/places/map`.

Lepszy podział:

```text
GET /api/map/places
-> id, slug, title, lat, lon, score, category, cover_thumb, counts

GET /api/places/{slug}
-> opis, local_comment, praktyczne wskazówki, linki oficjalne

GET /api/places/{slug}/media
-> zdjęcia, pamiątki, audio

GET /api/places/{slug}/stamps
-> publiczne pieczątki/pamiątki

POST /api/places/{slug}/stamp
-> kup/dodaj pieczątkę
```

## 11. Moderacja i bezpieczeństwo

Audio i zdjęcia od ludzi wymagają moderacji.

Minimum:

- status `pending` przed publikacją,
- zgoda na publikację,
- zgoda na wykorzystanie głosu/zdjęcia,
- zgłoszenie nadużycia,
- możliwość ukrycia pamiątki,
- limit długości audio,
- limit rozmiaru zdjęć,
- filtr oczywistych wulgaryzmów w transkrypcji,
- osobny panel admina do zatwierdzania.

Szczególnie przy audio trzeba uważać, bo mogą się nagrać osoby trzecie.

## 12. SEO

SEO nie powinno być tylko na „Wrocław atrakcje”. Tam będą mocni gracze.

Celować w long-tail:

```text
najlepsze miejsca na zdjęcie we Wrocławiu
selfie spoty Wrocław
nocny Wrocław gdzie iść
Pasaż Niepolda klimat
Wrocław miejsca z neonami
Wrocław na randkę mapa
Wrocław audio przewodnik
Wrocław cyfrowe pieczątki
```

Każde miejsce powinno mieć publiczną stronę:

```text
/miejsca/pasaz-niepolda
/miejsca/ostrow-tumski
/kolekcje/nocny-wroclaw
```

## 13. Co jest najważniejsze na teraz

Kolejność prac:

1. Uprościć pozycjonowanie: mapa miejsc do zdjęć, audio i pieczątek.
2. Dodać model audio.
3. Dodać model pieczątek.
4. Dodać 3 kolekcje startowe.
5. Dodać share card dla miejsca/kolekcji.
6. Odchudzić endpoint mapy.
7. Dopracować 30–50 miejsc we Wrocławiu.
8. Dopiero potem myśleć o skalowaniu na inne miasta.

## 14. Jednozdaniowa wizja

> **PhotoMaps to globalna mapa miejsc z klimatem, gdzie ludzie odkrywają dobre spoty do zdjęć, słuchają audio z miejsca, zostawiają pamiątki i zbierają cyfrowe pieczątki, którymi mogą się chwalić.**

## 15. Hasła do testowania

```text
Zbieraj miejsca, nie tylko zdjęcia.
```

```text
Mapa miejsc, które mają klimat.
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

## 16. Referencje i inspiracje do sprawdzenia

- PTTK GOT — tradycyjna książeczka, punkty i potwierdzenia/pieczątki: https://www.msw-pttk.org.pl/odznaki/reg_odznak/reg_got.html
- PTTK — lista odznak krajoznawczych, w tym geocaching: https://pttk.pl/odznaki-krajoznawcze/
- Tatrzański Park Narodowy — książeczka GOT jako produkt do zbierania punktów/potwierdzeń: https://tpn.gov.pl/sklep/ksiazeczka-got-pttk
- Geocaching — różnica między souvenirs, badges i trackable icons: https://www.geocaching.com/blog/2020/09/whats-the-difference-geocaching-souvenirs-badges-and-trackable-icons/
- Badania o grach lokacyjnych i motywacji do poruszania się po mieście: https://dl.acm.org/doi/10.1145/3611044
- Badanie o Pokémon GO i wpływie na ruch w mieście: https://arxiv.org/abs/1610.08098
- Badanie o Pokémon GO, miejscach i mobilności: https://arxiv.org/abs/1903.12041
- Badanie o gamifikacji/AR w turystyce i wpływie na przywiązanie do miejsca: https://journals.sagepub.com/doi/10.1177/00472875251332961

## 17. Krótka rekomendacja końcowa

Najmocniejsza wersja projektu to nie „lepszy przewodnik turystyczny”.

Najmocniejsza wersja to:

```text
Instagramowe spoty + audio klimat + cyfrowa książeczka pieczątek + pamiątki ludzi + mapa.
```

To jest prostsze, bardziej wiralowe i łatwiejsze do skalowania globalnie niż klasyczny katalog atrakcji.
