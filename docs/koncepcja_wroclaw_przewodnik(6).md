# Koncepcja projektu: lokalny przewodnik po Wrocławiu

## Najkrótsza definicja

Lokalny przewodnik po Wrocławiu bez sieciówek, pokazujący miejsca z charakterem, wybierane przez lokalsów i wzmacniane przez wspomnienia ludzi, którzy tam byli.

Projekt ma też działać jak wielojęzyczny GPS audio-przewodnik oraz mapa pamięci miasta: użytkownik idzie po Wrocławiu, aplikacja opowiada mu o miejscach w pobliżu, a dodatkowa warstwa pokazuje, jak dane miejsce wyglądało dawniej.

Marketingowo:

> Nie szukaj najbliższego McDonald’s. Odkryj Wrocław, który naprawdę warto zapamiętać.

Albo:

> Wrocław oczami lokalsów — odkrywaj miejsca z klimatem, słuchaj historii po drodze i zostaw własny ślad.

---

## Czym to NIE ma być

To nie ma być kolejna mapa jak Google Maps.

Nie chodzi o pokazanie wszystkich miejsc, restauracji, kawiarni i atrakcji.

Jeśli ktoś szuka:
- McDonald’s,
- KFC,
- Starbucksa,
- najbliższej sieciówki,
- zwykłego katalogu lokali,

to może użyć Google.

Ten projekt ma pokazywać miejsca, które mają klimat, lokalną wartość albo są warte zapamiętania.

---

## Główna idea

Projekt ma łączyć cztery filary:

1. **Przewodniki lokalsów**
2. **„Byłem tutaj” / cyfrowe pamiątki odwiedzających**
3. **Wielojęzyczny GPS audio-przewodnik**
4. **Warstwa historyczno-archiwalna: Wrocław kiedyś i dziś**

Mapa jest tylko interfejsem. Prawdziwą wartością są:
- selekcja miejsc,
- lokalna wiedza,
- nietypowe kategorie,
- wspomnienia ludzi,
- zdjęcia z krótkimi audio-wspomnieniami,
- opowieści audio uruchamiane kontekstem miejsca,
- archiwalne zdjęcia i historie pokazujące zmiany miasta,
- brak płatnego zaburzania rankingów przez lokale.

---

## Filar 1: przewodniki lokalsów

Kategorie nie powinny być ogólne jak w Google:

- restauracje,
- bary,
- kawiarnie,
- atrakcje turystyczne.

Zamiast tego kategorie mają odpowiadać na realne pytania turysty lub mieszkańca:

- bary mleczne z klimatem,
- tanie dobre jedzenie,
- street food po spacerze,
- miejsca na randkę bez spiny,
- Wrocław w deszczowy dzień,
- ukryte podwórka,
- miejsca na zdjęcia,
- Wrocław bez turystycznej ściemy,
- gdzie zabrać znajomych spoza miasta,
- miejsca po 22:00,
- lokalne klasyki,
- hidden gems,
- miejsca z historią,
- miejsca z klimatem, których nie widać od razu w Google.

Najważniejsze: użytkownik nie dostaje tylko listy miejsc, ale lokalny wybór i kontekst.

---

## Filar 2: „Byłem tutaj”

Ludzie mogą dodać swoją pamiątkę przy danym miejscu.

Nie chodzi o zwykły upload zdjęcia jedzenia czy talerza.

Chodzi o emocjonalny komunikat:

- byłem tutaj,
- zobacz, to ja,
- zostawiłem ślad we Wrocławiu,
- mam link do pamiątki,
- mogę pokazać znajomym, że odwiedziłem to miejsce.

To jest cyfrowa wersja:
- księgi gości,
- pocztówki,
- turystycznej pieczątki,
- ściany z polaroidami,
- napisu „tu byłem”.

Taka pamiątka może być płatna, bo użytkownik nie płaci za pomoc w budowaniu bazy zdjęć, tylko za własny widoczny ślad.

---
---

## Rozszerzenie filaru „Byłem tutaj”: audio-wspomnienia

Pamiątka użytkownika nie musi być tylko zdjęciem i podpisem.

Może mieć format:

> zdjęcie + krótki głos z miejsca

To ma działać jak mały snapshot, ale bez filmu.

Nie robimy ciężkich materiałów video. Robimy lekkie, osobiste wspomnienia:

- zdjęcie,
- podpis,
- 10–30 sekund audio,
- imię/pseudonim,
- miasto/kraj,
- data wizyty,
- link do udostępnienia.

Przykład:

> „Byliśmy tu pierwszy raz, trochę padało, ale klimat mega. Polecam wejść od bocznej ulicy.”

To daje miejscu coś więcej niż galerię zdjęć — daje głosy ludzi, którzy naprawdę tam byli.

### Dwie warstwy audio przy miejscu

1. **Audio-przewodnik**
   - oficjalny opis miejsca,
   - historia,
   - lokalny komentarz,
   - wersje językowe,
   - trasy GPS.

2. **Audio-wspomnienia ludzi**
   - krótkie wiadomości głosowe odwiedzających,
   - emocje z miejsca,
   - krótkie polecenia,
   - osobiste „byłem tutaj”.

W UI można to rozdzielić prosto:

- „Posłuchaj przewodnika”
- „Posłuchaj wspomnień ludzi”

### Zasady audio-wspomnień

- maksymalnie 30 sekund na nagranie,
- tylko audio, bez video,
- moderacja przed publikacją,
- możliwość zgłoszenia nagrania,
- zakaz obrażania ludzi/lokali,
- zakaz danych prywatnych innych osób,
- publicznie widoczne tylko zatwierdzone nagrania.

### Monetyzacja audio-wspomnień

Płatna pamiątka może mieć poziomy:

- zdjęcie + podpis,
- zdjęcie + podpis + audio,
- wyróżniona audio-pocztówka,
- publiczny link do pamiątki.

Najprostszy komunikat:

> Zostaw zdjęcie i głos z miejsca, w którym byłeś.


## Filar 3: wielojęzyczny GPS audio-przewodnik

To może być jedna z najmocniejszych warstw produktu.

Użytkownik wybiera język i tryb zwiedzania, a aplikacja wykorzystuje lokalizację GPS, żeby odtwarzać krótkie opisy miejsc w pobliżu. Obok oficjalnego audio-przewodnika można też odtwarzać krótkie audio-wspomnienia osób, które były w danym miejscu.

To działa jak przewodnik na żywo:

- użytkownik idzie po mieście,
- aplikacja wie, przy jakim miejscu się znajduje,
- odpala krótki opis audio,
- użytkownik nie musi czytać długich tekstów,
- turysta dostaje lokalny kontekst w swoim języku,
- może też usłyszeć krótkie głosy innych odwiedzających.

Przykładowe języki:

- polski,
- angielski,
- niemiecki,
- ukraiński,
- czeski,
- hiszpański.

Przykładowe tryby audio:

- Wrocław w 2 godziny,
- pierwszy raz we Wrocławiu,
- historia bez nudy,
- ukryte podwórka,
- bary mleczne i lokalne klasyki,
- Wrocław w deszczowy dzień,
- miejsca na zdjęcia,
- spacer bez tłumów,
- Wrocław po 22:00.

Najważniejsze: opisy audio nie powinny brzmieć jak Wikipedia.

Nie:

> Budynek powstał w roku 1898 i reprezentuje styl...

Lepiej:

> To jest jedno z tych miejsc, obok których większość turystów przechodzi, nie wiedząc, że kryje się tu jedna z ciekawszych historii tej okolicy.

Styl audio:

- krótki,
- mówiony,
- lokalny,
- bez nudy,
- z konkretem,
- z ciekawostką,
- maksymalnie 30–90 sekund na krótką wersję,
- opcjonalnie dłuższa wersja 2–3 minuty.

To odróżnia projekt od zwykłej mapy.

Google pokazuje miejsce. Ten projekt może je opowiadać.

---
---

## Filar 4: warstwa historyczno-archiwalna — Wrocław kiedyś i dziś

To kolejna mocna warstwa produktu.

Aplikacja może pokazywać nie tylko to, co warto zobaczyć dzisiaj, ale też to, jak dane miejsce wyglądało dawniej.

To robi z projektu nie tylko przewodnik turystyczny, ale też mapę pamięci miasta.

Przykładowe typy treści:

- stare zdjęcia Wrocławia,
- zniszczenia z II wojny światowej,
- dawny układ ulic,
- nieistniejące budynki,
- dawne firmy, zakłady i fabryki,
- stare szyldy, neony i punkty usługowe,
- porównania „kiedyś i dziś”,
- miejsca, które całkowicie zmieniły funkcję,
- ślady miasta, których nie widać na pierwszy rzut oka.

Najmocniejszy format:

> Kiedyś vs dziś

Czyli przy jednym miejscu można pokazać:

- aktualne zdjęcie,
- archiwalne zdjęcie,
- krótki opis zmiany,
- audio opowiadające historię miejsca,
- informację, co było tu wcześniej.

Przykład doświadczenia użytkownika:

> Dzisiaj widzisz zwykłą ulicę, ale po wojnie ten fragment miasta wyglądał zupełnie inaczej. W tym miejscu stał budynek, który zniknął po zniszczeniach, a układ ulic został później przebudowany.

Ta warstwa dobrze pasuje do audio-przewodnika. Użytkownik może iść po mieście i słyszeć nie tylko, co jest teraz, ale też co było tu kiedyś.

Przykładowe kategorie historyczne:

- Wrocław przed wojną,
- zniszczenia wojenne,
- Wrocław po 1945,
- nieistniejące budynki,
- dawne zakłady i fabryki,
- stare sklepy i firmy,
- dawne szyldy i neony,
- zmieniony układ ulic,
- Breslau / dawny Wrocław,
- metamorfozy miejsc,
- ślady historii.

To może być osobny filtr na mapie:

> Pokaż warstwę: Wrocław kiedyś i dziś

Albo osobny tryb spaceru:

> Spacer historyczny: miasto, którego już nie ma

Ważne: przy archiwalnych zdjęciach trzeba uważać na prawa autorskie i źródła. Najbezpieczniej korzystać z:

- domeny publicznej,
- otwartych archiwów,
- materiałów z jasną licencją,
- własnych zdjęć porównawczych,
- linkowania do źródeł, jeśli nie można hostować zdjęcia,
- krótkich autorskich opisów zamiast kopiowania cudzych tekstów.

Ta warstwa wzmacnia unikalność projektu, bo Google pokazuje głównie aktualne miejsca, a ten projekt może pokazywać kontekst, pamięć i zmiany miasta.

## Zasada anty-sieciówkowa

Na mapie nie powinno być wielkich sieciówek.

### Nie dodajemy:

- McDonald’s,
- KFC,
- Starbucks,
- Costa,
- galerii handlowych jako atrakcji,
- franczyz bez lokalnego charakteru,
- miejsc, które są tylko kolejnym punktem znanej marki.

### Dodajemy:

- lokalne bary,
- bary mleczne,
- małe kawiarnie,
- food trucki,
- murale,
- podwórka,
- neony,
- dziwne miejscówki,
- punkty widokowe,
- miejsca z historią,
- miejsca z klimatem,
- lokalne klasyki,
- ukryte perełki.

Możliwy manifest:

> Nie pokazujemy wszystkiego. Pokazujemy miejsca, które mają sens.

Albo mocniej:

> Nie jesteśmy mapą sieciówek. Tu trafiają miejsca z charakterem.

---

## Selekcja miejsc

Nie wszystko trafia na mapę.

Samo istnienie miejsca nie wystarczy. Miejsce musi pasować do charakteru przewodnika.

Użytkownicy mogą proponować miejsca, ale finalna decyzja powinna być kuratorska.

Miejsce powinno spełniać przynajmniej jeden z warunków:

- ma lokalny klimat,
- jest przydatne dla turysty,
- zna je wielu mieszkańców,
- jest dobrą alternatywą dla turystycznej oczywistości,
- ma historię,
- jest tanie i dobre,
- jest nietypowe,
- jest warte pokazania znajomym spoza miasta,
- jest dobrym punktem do zdjęcia lub wspomnienia,
- ma potencjał na ciekawy opis audio,
- ma ciekawy kontekst historyczny albo archiwalny.

Najważniejsza zasada:

> Mapa nie ma być pełna. Ma być dobra.

---

## Ranking miejsc

Lokale nie powinny móc płacić za wyższą pozycję.

To ważne, bo płatna promocja zaburza jakość: wygra większy budżet, a niekoniecznie lepsze miejsce.

Ranking powinien opierać się na realnym zainteresowaniu ludzi oraz lokalnej wartości miejsca.

Prosty model:

> siła miejsca = liczba zdjęć / pamiątek × waga miejsca

### Liczba zdjęć / pamiątek pokazuje:

- że ludzie faktycznie tam chodzą,
- że miejsce jest odwiedzane,
- że ktoś chciał zostawić tam wspomnienie,
- że miejsce ma społeczną energię.

### Waga miejsca pokazuje:

- lokalny klimat,
- unikalność,
- autentyczność,
- ukrytość,
- wartość przewodnikową,
- czy lokals faktycznie by je polecił,
- czy miejsce nie jest tylko oczywistą atrakcją,
- czy miejsce ma wartość jako przystanek audio-przewodnika,
- czy miejsce ma ciekawą warstwę historyczną albo archiwalne porównanie.

Dzięki temu Rynek nie wygrywa automatycznie tylko dlatego, że każdy tam był.

Mały bar mleczny, ukryte podwórko albo lokalna perełka mogą być wysoko, jeśli mają większą wagę jakościową.

---

## Przykładowe poziomy wagi miejsca

- **0.5** — oczywiste miejsce turystyczne,
- **1.0** — normalne dobre miejsce,
- **1.5** — mocne lokalne polecenie,
- **2.0** — hidden gem,
- **3.0** — miejsce wyjątkowe, kultowe albo bardzo lokalne.

Publicznie nie trzeba tego nazywać „wagą miejsca”.

Dla użytkowników lepsze nazwy to:

- popularne wśród odwiedzających,
- polecane przez lokalsów,
- ukryte perełki,
- najwięcej wspomnień,
- najmocniejszy lokalny klimat.

---

## Etykiety miejsc

Miejsca mogą mieć krótkie, zrozumiałe oznaczenia:

- hidden gem,
- lokalny klasyk,
- tanie i dobre,
- bez turystycznej ściemy,
- dobre na deszcz,
- dobre na randkę,
- dobre solo,
- dobre po 22:00,
- warto raz,
- warto wracać,
- dobre na zdjęcia,
- dla znajomych spoza miasta,
- klimat starego Wrocławia,
- dobry punkt audio,
- historia bez nudy,
- kiedyś i dziś,
- ślad wojny,
- dawny Wrocław,
- nieistniejące miejsce.

Etykiety powinny pomagać użytkownikowi szybko zrozumieć, po co jest dane miejsce.

---

## Lokalny komentarz

Każde miejsce powinno mieć krótki opis pisany jak polecenie od lokalsa, nie jak tekst z katalogu firm.

Dobre sekcje przy miejscu:

- dlaczego warto,
- kiedy iść,
- czego nie oczekiwać,
- co zamówić / co zobaczyć,
- dla kogo to miejsce,
- czy warto z dzieckiem,
- czy warto wieczorem,
- czy nadaje się na randkę,
- czy jest tanio,
- czy to miejsce jest bardziej dla turysty, czy lokalsa,
- czy warto słuchać opisu audio w tym miejscu,
- co było tutaj kiedyś,
- czy istnieją archiwalne zdjęcia miejsca.

Przykład stylu:

> Tu idziesz, jeśli chcesz zjeść normalny obiad bez udawania, że pierogi są doświadczeniem premium.

---

## Sekcja „nie dla każdego”

To może być wyróżnik przewodnika.

Niektóre miejsca są dobre, ale nie dla wszystkich. Warto mówić to wprost.

Przykład:

> Idź tutaj, jeśli chcesz tani obiad i klimat starego baru.

> Nie idź tutaj, jeśli oczekujesz eleganckiej obsługi i pięknego wnętrza.

To buduje zaufanie, bo przewodnik nie udaje, że każde miejsce jest idealne.

---

## Gotowe trasy

Poza pojedynczymi miejscami warto tworzyć gotowe trasy.

Przykłady:

- spacer na 2 godziny,
- Wrocław za 30 zł,
- randka bez spiny,
- wieczór po 22:00,
- pierwszy raz we Wrocławiu,
- Wrocław, gdy pada,
- spacer bez tłumów,
- bary mleczne i klasyki,
- murale i podwórka,
- zdjęciowy spacer po Wrocławiu,
- Wrocław kiedyś i dziś,
- ślady wojny,
- stare firmy i zakłady,
- miasto, którego już nie ma.

Trasy są mocniejsze niż sama lista pinezek, bo użytkownik dostaje gotowy plan.

Trasy mogą być też trasami audio. Wtedy użytkownik nie tylko widzi kolejność miejsc, ale słyszy opisy po drodze.

Część tras może być historyczna i działać jak spacer po warstwach miasta: co było tutaj dawniej, co zniknęło, co zostało przebudowane.

---

## Paszport Wrocławia / cyfrowe pieczątki

Mechanika „byłem tutaj” może mieć formę paszportu.

Użytkownik zbiera cyfrowe pieczątki za odwiedzone miejsca albo dodane pamiątki.

Przykłady:

- byłem w 5 barach mlecznych,
- zaliczyłem Wrocław w deszczu,
- odkryłem 3 ukryte podwórka,
- mam 10 pamiątek z Wrocławia,
- przeszedłem trasę „Wrocław za 30 zł”,
- odwiedziłem 5 miejsc bez sieciówek,
- przesłuchałem całą trasę audio „Pierwszy raz we Wrocławiu”.

To daje powód, żeby wracać do aplikacji.

---

## Sezony i okazje

Przewodniki mogą być sezonowe albo sytuacyjne:

- Wrocław zimą,
- Wrocław latem,
- majówka,
- jarmark bez pułapek,
- gdzie uciec od tłumów,
- gdzie iść po koncercie,
- co robić, gdy pada,
- gdzie zjeść po 22:00,
- Wrocław na pierwszy weekend.

To pozwala odświeżać treść bez zmiany głównej idei.

---

## Wspomnienia jako format

Pamiątka użytkownika może zawierać:

- zdjęcie,
- krótki podpis,
- opcjonalne audio 10–30 sekund,
- imię lub pseudonim,
- miasto/kraj autora,
- data wizyty,
- emoji/nastrój,
- link do udostępnienia.

Przykład:

> Michał z Krakowa  
> “Pierwszy raz we Wrocławiu. Nie żałuję pierogów.”

Pamiątka powinna być czymś do pokazania znajomym, nie tylko wpisem w bazie danych. Najmocniejszy format to zdjęcie + krótki głos z miejsca.

---

## Mechanizm jakości: „to miejsce się zmieniło”

Użytkownicy powinni móc zgłaszać, że miejsce straciło wartość albo informacja jest nieaktualna.

Przykładowe powody:

- miejsce zamknięte,
- zmieniło właściciela,
- ceny mocno wzrosły,
- zrobiło się zbyt turystyczne,
- klimat zniknął,
- jakość spadła,
- już nie polecam,
- dane są nieaktualne.

To pomaga utrzymać przewodnik żywy i wiarygodny.

---

## Monetyzacja — bez sprzedawania rankingu

Nie chcemy, żeby lokale płaciły za wyższą pozycję, bo to niszczy zaufanie.

Możliwe źródła monetyzacji, które nie zaburzają rankingów:

- płatna pamiątka „byłem tutaj”,
- płatna cyfrowa pocztówka,
- płatne audio-wspomnienie do pamiątki,
- link do własnej strony pamiątki,
- drukowana pocztówka / plakat / kod QR,
- premium profil użytkownika,
- pakiety przewodników,
- płatne trasy audio,
- pełny wielojęzyczny audio-przewodnik,
- płatne spacery historyczne „Wrocław kiedyś i dziś”,
- współprace partnerskie bez wpływu na ranking,
- sponsorowanie całych kategorii z jasnym oznaczeniem, bez zmiany kolejności miejsc.

Najważniejsza zasada:

> Lokale nie kupują pozycji. Ludzie głosują obecnością i wspomnieniami, a lokalsi nadają kontekst.

Audio-przewodnik może być jedną z bardziej naturalnych płatnych funkcji, bo użytkownik płaci za realną usługę podobną do przewodnika turystycznego.

Przykładowe płatności:

- darmowa mapa + kilka darmowych opisów,
- płatna trasa audio,
- pakiet „Wrocław w 2 godziny”,
- pakiet „Historia bez nudy”,
- pełny przewodnik audio w wybranym języku.

---

## Ton i styl projektu

Projekt powinien być:

- lokalny,
- szczery,
- trochę subiektywny,
- bez korporacyjnego języka,
- bez turystycznej ściemy,
- bardziej jak polecenie od znajomego niż katalog firm.

Zamiast:

> Popularny lokal gastronomiczny oferujący dania kuchni polskiej.

Lepiej:

> Tu idziesz, jeśli chcesz zjeść normalny obiad bez udawania, że pierogi są doświadczeniem premium.

Dla audio styl powinien być jeszcze bardziej mówiony:

> Po prawej masz miejsce, które wygląda niepozornie, ale właśnie dlatego warto się tu zatrzymać.

---

## Najważniejsze założenia

1. Nie konkurujemy z Google Maps jako katalog miejsc.
2. Wygrywamy lokalnym wyborem i klimatem.
3. Nie pokazujemy wielkich sieciówek.
4. Lokale nie mogą kupić wyższej pozycji.
5. Ranking opiera się na pamiątkach/zdjęciach i wadze miejsca.
6. Miejsca wybierane są przez lokalną wiedzę, nie przez reklamę.
7. Użytkownik może zostawić własną pamiątkę „byłem tutaj”.
8. Pamiątka może być płatna, bo ma wartość emocjonalną.
9. Mapa jest interfejsem, ale produktem są przewodniki, audio i wspomnienia.
10. Projekt ma być przewodnikiem z charakterem, nie neutralną bazą danych.
11. Nie wszystko trafia na mapę — selekcja jest częścią wartości.
12. Gotowe trasy mogą być ważniejsze niż sama lista miejsc.
13. Cyfrowe pieczątki/paszport mogą zwiększyć powroty do aplikacji.
14. Użytkownicy mogą pomagać utrzymać jakość przez zgłaszanie zmian.
15. Styl ma być szczery, lokalny i subiektywny.
16. Audio-przewodnik GPS może być trzecią główną warstwą produktu.
17. Wielojęzyczność zwiększa sens projektu dla turystów.
18. Opisy audio mają brzmieć jak żywy przewodnik, nie jak Wikipedia.
19. Warstwa archiwalna pokazuje, jak Wrocław zmieniał się w czasie.
20. Historyczne zdjęcia i opisy muszą mieć uporządkowane źródła oraz prawa użycia.
21. Pamiątki mogą mieć formę zdjęcia, podpisu i krótkiego audio-snapshotu.
22. Przy miejscu mogą istnieć dwie warstwy audio: oficjalny przewodnik i głosy ludzi, którzy tam byli.
23. Implementacja musi zaczynać się od MVP, a nie od pełnej wizji.
24. Głównym bytem systemu jest miejsce (`place`), a reszta funkcji to warstwy przypięte do miejsca.
25. Pierwsze wdrożenie ma objąć miejsca, kategorie, mapę, zdjęcia i pamiątki; audio, historia i płatności przychodzą później.

---
---
---

## Zakres implementacji: wizja końcowa vs MVP

Dokument opisuje szeroką wizję produktu, ale nie należy implementować wszystkiego naraz.

Najważniejsza decyzja:

> Najpierw budujemy prosty, działający szkielet. Dopiero potem dokładamy kolejne warstwy.

Obecna wizja zawiera dużo funkcji:

- miejsca,
- kategorie,
- przewodniki lokalsów,
- zdjęcia,
- pamiątki „byłem tutaj”,
- audio-wspomnienia,
- audio-przewodnik GPS,
- warstwę historyczną,
- trasy,
- paszport / pieczątki,
- wielojęzyczność,
- płatności.

To jest kierunek rozwoju, a nie zakres pierwszej wersji.

---

## Najważniejsza zasada architektury

Głównym bytem aplikacji jest:

> **place — miejsce**

Wszystko inne jest tylko warstwą przypiętą do miejsca.

Struktura myślenia:

```txt
place
 ├── category
 ├── photos
 ├── memories
 ├── audio_items
 ├── historical_items
 ├── guides
 ├── reports
 └── future_layers
```

To oznacza:

- pinezka na mapie reprezentuje miejsce,
- zdjęcia należą do miejsca,
- pamiątki należą do miejsca,
- audio należy do miejsca,
- historia „kiedyś i dziś” należy do miejsca,
- przewodniki są kolekcjami miejsc,
- zgłoszenia dotyczą miejsca albo treści przypiętej do miejsca.

Nie tworzyć osobnych światów dla zdjęć, audio, historii i pamiątek.

Każda kolejna funkcja ma być warstwą miejsca, nie przebudową całej aplikacji.

---

## MVP 1: podstawowy szkielet

Pierwszy etap ma udowodnić, że nowy produkt działa jako mapa miejsc.

Zakres:

- SQLite jako baza metadanych,
- tabela miejsc,
- tabela kategorii,
- mapa pokazująca miejsca,
- admin może dodać miejsce,
- admin może wybrać kategorię,
- admin może ustawić wagę miejsca,
- miejsce ma opis i lokalny komentarz,
- miejsce pojawia się jako pinezka,
- publiczna mapa pokazuje tylko opublikowane miejsca.

Nie wdrażać jeszcze:

- płatności,
- audio,
- historii,
- paszportu,
- tras,
- wielojęzyczności,
- pełnej społeczności.

Cel MVP 1:

> Dodać miejsce → zobaczyć je na mapie → mieć podstawowy lokalny przewodnik.

---

## MVP 2: zdjęcia i pamiątki

Drugi etap dodaje treści użytkowników, ale nadal w prostej formie.

Zakres:

- zdjęcia miejsca,
- pamiątki „byłem tutaj”,
- upload zdjęć,
- usuwanie EXIF z wersji publicznej,
- miniatury,
- status pending / approved / rejected,
- panel moderacji,
- publicznie widoczne tylko zatwierdzone treści,
- licznik zdjęć i pamiątek przy miejscu.

Cel MVP 2:

> Miejsce ma zdjęcia i pamiątki ludzi, ale wszystko przechodzi moderację.

---

## MVP 3: przewodniki / kolekcje miejsc

Trzeci etap dodaje przewodniki lokalsów.

Zakres:

- guides,
- relacja miejsce ↔ przewodnik,
- strona przewodnika,
- sortowanie miejsc w przewodniku,
- przewodniki typu „Wrocław za 30 zł”, „Bary mleczne z klimatem”, „Wrocław w deszczowy dzień”.

Cel MVP 3:

> Użytkownik dostaje gotowe lokalne wybory, nie tylko luźną mapę.

---

## Funkcje późniejsze

Dopiero po działającym rdzeniu warto dodawać:

- audio-wspomnienia,
- wielojęzyczny GPS audio-przewodnik,
- warstwę historyczną „Wrocław kiedyś i dziś”,
- trasy audio,
- paszport / cyfrowe pieczątki,
- płatności,
- publiczne strony pamiątek,
- zaawansowany ranking,
- wiele języków,
- konta użytkowników.

Te funkcje są ważne, ale nie powinny blokować pierwszego wdrożenia.

---

## Manifest implementacyjny

1. Nie wdrażać wszystkich pomysłów naraz.
2. Najpierw zbudować prosty, działający rdzeń.
3. Każda funkcja ma być warstwą miejsca.
4. Nie robić osobnej architektury dla każdego dodatku.
5. Nie zaczynać od płatności.
6. Nie zaczynać od audio GPS.
7. Nie zaczynać od historii miasta.
8. Najpierw miejsca, kategorie, mapa, zdjęcia i pamiątki.
9. Dopiero potem przewodniki, audio, historia i monetyzacja.
10. Lepszy mały działający produkt niż wielka niedokończona wizja.

Najważniejsze zdanie dla implementacji:

> Miejsce jest centrum systemu. Wszystko inne jest warstwą przypiętą do miejsca.

## Sugerowane nazwy domen / stron

Najmocniejsze robocze adresy:

- **wroclawbezsciemy.pl**
- **tubylemwroclaw.pl**
- **wroclawlokalsow.pl**

### Kierunek 1: wroclawbezsciemy.pl

Najmocniejsza nazwa pod główną markę.

Komunikuje:

- brak turystycznej ściemy,
- brak sieciówek,
- lokalną selekcję,
- szczery przewodnik,
- miejsca z charakterem.

Możliwy brand:

> Wrocław Bez Ściemy

Możliwy slogan:

> Lokalny przewodnik po Wrocławiu bez sieciówek i kupionych rankingów.

### Kierunek 2: tubylemwroclaw.pl

Najlepsze pod funkcję pamiątek „byłem tutaj”.

Komunikuje:

- osobisty ślad,
- zdjęcie/pamiątkę z miejsca,
- cyfrową księgę gości,
- link do pokazania znajomym.

Możliwy brand/funkcja:

> Tu byłem we Wrocławiu

Możliwy slogan:

> Zostaw swoją pamiątkę tam, gdzie naprawdę byłeś.

### Kierunek 3: wroclawlokalsow.pl

Najbardziej spokojna i przewodnikowa nazwa.

Komunikuje:

- wiedzę mieszkańców,
- lokalny wybór,
- przewodnik tworzony z perspektywy lokalsów,
- mniej agresywny ton niż „bez ściemy”.

Możliwy brand:

> Wrocław Lokalsów

Możliwy slogan:

> Miejsca, które pokazaliby Ci mieszkańcy.

### Najlepsze użycie

Główna marka:

> wroclawbezsciemy.pl

Funkcja pamiątek:

> tubylemwroclaw.pl

Alternatywna, łagodniejsza marka:

> wroclawlokalsow.pl

Najbardziej spójny wariant:

> Wrocław Bez Ściemy — lokalny przewodnik bez sieciówek. Zostaw pamiątkę: tu byłem.

## Jednozdaniowa wersja

Wrocław oczami lokalsów: bez sieciówek, bez kupowania rankingów, z miejscami z charakterem, trasami, wielojęzycznym audio-przewodnikiem GPS, zdjęciowo-audio pamiątkami ludzi i warstwą „Wrocław kiedyś i dziś”.
