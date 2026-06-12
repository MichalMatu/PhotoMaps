# Kierunek Produktu

PhotoMap to globalna wizualna mapa miejsc z klimatem. Produkt nie jest encyklopedycznym przewodnikiem turystycznym i nie jest zwykla mapa z pinami. Wroclaw jest pierwszym miastem startowym, na ktorym dopracowujemy mape miniaturek, jakosc danych, zdjecia, pamiatki, trasy/kolekcje, moderacje i content pipeline.

Najkrotszy opis:

```txt
Mapa jako tablica miniaturek miejsc, gdzie widac klimat miasta, zdjecia, pamiatki ludzi, trasy i pozniej audio oraz pieczatki.
```

## Rdzen Produktu

Centralnym bytem jest `place`. `City` organizuje dane, `Category` opisuje charakter miejsca, a reszta jest warstwa wokol miejsca albo kolekcji miejsc:

- zdjecia i covery,
- pamiatki ludzi,
- trasy albo kolekcje miejsc,
- zgloszenia jakosci,
- przyszle audio,
- przyszle pieczatki.

Nie tworzymy osobnych produktow dla zdjec, pamiatek, tras, audio czy historii. Mapa ma laczyc je przez miejsce.

## Doswiadczenie Mapy

Pierwszy kontakt z PhotoMap ma byc wizualny. Uzytkownik wchodzi na mape miasta i od razu widzi atrakcyjna plansze miniaturek. Klikniecie miejsca pokazuje szczegoly, ale mapa musi byc ciekawa jeszcze przed kliknieciem.

Zasady produktu:

- publiczne markery to miniatury, covery albo klastry miniaturek,
- zwykle pinezki nie sa domyslnym jezykiem publicznej mapy,
- zoom zmienia gestosc i rozmiar elementow,
- warstwy pomagaja ogladac dane: polecane, galerie, pamiatki, pozniej audio i trasy,
- kategorie pochodza z danych i nie powinny byc twardo wpisane w UI,
- publiczna mapa ma zachowac efekt wizualnej tablicy nawet po optymalizacji kontraktu API.

## Pierwsze Miasto

MVP pierwszego miasta to 30-50 dobrze wybranych miejsc, nie tysiace rekordow. Wroclaw jest datasetem startowym do strojenia produktu:

- kazde opublikowane miejsce ma sensowny cover,
- miejsca maja kategorie, opis, lokalny komentarz i pozycje,
- kilka miejsc ma dodatkowe zdjecia albo pamiatki,
- ranking i wagi pozwalaja testowac widocznosc markerow,
- admin i moderacja pomagaja utrzymac jakosc danych.

Pierwsza probka 10-15 miejsc sluzy do strojenia mapy. Pelniejszy zakres 30-50 miejsc sluzy do oceny MVP pierwszego miasta.

## Kierunek Globalny

PhotoMap ma od poczatku wspierac kolejne miasta. Rollout kolejnych miast powinien isc przez content pipeline:

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
- zdjecie,
- pieczatka.

Techniczne `guide` moze zostac w backendzie. Produktowo mowimy `trasa` albo `kolekcja miejsc`, zaleznie od kontekstu.

## Poza Aktualnym Etapem

Audio, pieczatki, platnosci, konta i rozbudowane SEO sa kierunkiem pozniejszym. Obecny nacisk jest w [PLAN.md](../PLAN.md): dane startowe, covery, ocena mapy, Map Experience v1, galerie, dynamiczne kategorie i stabilizacja `map preview`.
