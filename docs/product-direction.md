# Kierunek Produktu

PhotoMap to globalna wizualna mapa miejsc z klimatem. Produkt nie jest encyklopedycznym przewodnikiem turystycznym i nie jest zwykla mapa z pinami. Wroclaw jest pierwszym miastem startowym, na ktorym redukujemy zakres do najmocniejszego rdzenia: mapa miniaturek, miejsca, covery, pamiatki, proste kolekcje, moderacja i content pipeline.

Najkrotszy opis:

```txt
Mapa jako tablica miniaturek miejsc, gdzie widac klimat miasta, zdjecia, pamiatki ludzi i proste kolekcje miejsc.
```

## Rdzen Produktu

Centralnym bytem jest `place`. `City` organizuje dane, `Category` opisuje charakter miejsca, a reszta jest warstwa wokol miejsca albo kolekcji miejsc:

- zdjecia i covery,
- pamiatki ludzi,
- trasy albo kolekcje miejsc,
- lekkie zgloszenia jakosci.

Nie tworzymy osobnych produktow dla zdjec, pamiatek, tras, audio czy historii. Mapa ma laczyc potrzebne warstwy przez miejsce, a formaty spoza aktualnego zakresu zostaja zamrozone.

## Doswiadczenie Mapy

Pierwszy kontakt z PhotoMap ma byc wizualny. Uzytkownik wchodzi na mape miasta i od razu widzi atrakcyjna plansze miniaturek. Klikniecie miejsca pokazuje szczegoly, ale mapa musi byc ciekawa jeszcze przed kliknieciem.

Zasady produktu:

- publiczne markery to miniatury, covery albo klastry miniaturek,
- zwykle pinezki nie sa domyslnym jezykiem publicznej mapy,
- zoom zmienia gestosc i rozmiar elementow,
- klikniecie miniatury w wachlarzu otwiera bezposrednio jeden lekki widok medium; nie dodajemy posredniego podgladu tego samego zdjecia,
- widok medium eksponuje obraz, nazwe miejsca i jeden kompaktowy blok tekstu: podpis zdjecia z opisem miejsca albo dane pamiatki,
- akcje pomocnicze, takie jak edycja pamiatki i zgloszenie problemu, pozostaja male i drugoplanowe,
- zewnetrzne materialy maja byc pozniej osobnymi, strukturalnymi linkami przypietymi do miejsca, a nie tekstem w podpisie zdjecia,
- warstwy pomagaja ogladac dane: polecane, galerie, pamiatki i proste kolekcje,
- kategorie pochodza z danych i nie powinny byc twardo wpisane w UI,
- publiczna mapa ma zachowac efekt wizualnej tablicy nawet po optymalizacji kontraktu API.

Kontrakt filtrow mapy:

- `Polecane`, `Miejsca` i `Pamiatki` dzialaja jak niezalezne przelaczniki,
- jedna albo dwie aktywne warstwy sa pokazywane dokladnie jako te wybrane kontrolki,
- komplet trzech aktywnych warstw zwija sie wizualnie do jednej kontrolki `Wszystkie`,
- `Wszystkie` wlaczone z dowolnego stanu pokazuje pelny widok mapy,
- `Wszystkie` klikniete, gdy jest juz aktywne, czysci warstwy i zostawia sama mape bazowa,
- nie pokazujemy osobnego toastu/licznika liczby miejsc po filtrze; liczby naleza do kontrolek warstw i kategorii.

## Pierwsze Miasto

Pierwsze miasto ma miec tylko tyle dobrze wybranych miejsc, ile potrzeba do sprawdzenia mapy. Wroclaw jest datasetem startowym do strojenia produktu:

- kazde opublikowane miejsce ma sensowny cover,
- miejsca maja kategorie, opis, lokalny komentarz i pozycje,
- wybrane miejsca maja dodatkowe zdjecia albo pamiatki,
- ranking i wagi pozwalaja testowac widocznosc markerow,
- admin i moderacja pomagaja utrzymac jakosc danych.

Nie gonimy za liczba rekordow. Najpierw mapa ma dzialac dobrze na aktualnej probce, dopiero potem rozszerzamy dataset.

Aktualna lokalna baza jest robocza i moze zawierac dummy content. Nie traktujemy jej samej jako zrodla zadan content-quality. Prace nad jakoscia danych maja sens dopiero przy realnym manifescie, realnych assetach albo konkretnym bledzie danych wskazanym przez uzytkownika.

## Kierunek Globalny

PhotoMap ma technicznie wspierac kolejne miasta, ale rollout nie jest biezacym celem. Kiedy przyjdzie czas na kolejne miasto, powinno wejsc przez content pipeline:

```txt
content/cities/{city}/manifest.json -> import -> moderacja/korekty -> publiczna mapa miasta
```

Admin UI sluzy do korekt, moderacji i pojedynczych zmian. Wieksze paczki miejsc, tras i danych redakcyjnych powinny byc powtarzalne przez manifesty.

## Jezyk Produktu

W UI i dokumentacji produktowej preferujemy proste slowa:

- miejsce,
- mapa,
- miasto,
- kategoria,
- pamiatka,
- trasa,
- kolekcja,
- zdjecie.

Techniczne `guide` moze zostac w backendzie. Produktowo mowimy `trasa` albo `kolekcja miejsc`, zaleznie od kontekstu.

## Aktualny Nacisk

Nie utrzymujemy osobnej listy zadan produktowych. Ten dokument jest zrodlem kierunku, a nowe prace powinny wzmacniac jeden z trzech obszarow:

- czytelnosc i atrakcyjnosc publicznej mapy na realnych danych,
- jakosc danych miejsc, zdjec, pamiatek i prostych kolekcji,
- prostote admina jako narzedzia korekt, moderacji i pojedynczych zmian.

## Todo

To lista rzeczy odlozonych. Nie wybieramy ich jako kolejnych prac bez osobnej decyzji produktowej:

- audio,
- pieczatki,
- platnosci,
- konta uzytkownikow,
- rozbudowane SEO,
- nowe miasta jako aktywne wdrozenie,
- duze nowe funkcje admina,
- pelne galerie albo pelne pamiatki w pierwszym renderze mapy.

Nowa praca wchodzi tylko wtedy, gdy poprawia czytelnosc mapy, pokazanie miejsca albo utrzymanie danych.
