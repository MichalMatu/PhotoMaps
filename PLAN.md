# Plan

Plan jest po redukcji zakresu i po sprawdzeniu aktualnego kodu oraz historii git. Nie traktujemy jako otwartych prac rzeczy, ktore sa juz wdrozone: `map preview`, warstwy mapy, wachlarz miniatur, bezposredni modal medium, skala markerow wedlug zoomu i wagi, publiczne kontrakty miejsc, podstawowe trasy/kolekcje, admin CRUD/moderacja oraz content pipeline.

## Nastepne Wdrozenie

Domknac realny quality pass publicznej mapy na obecnym datasecie Wroclawia.

Zakres wdrozenia:

- uruchomic lokalnie publiczna mape na danych z repo,
- sprawdzic pierwszy viewport bez mockow i bez dopisywania nowych funkcji,
- poprawic tylko realne problemy z czytelnoscia markerow, kolizjami, kadrowaniem albo pustym pierwszym widokiem,
- nie dodawac nowych warstw, nowych kontraktow API ani nowych typow contentu,
- po zmianie uruchomic testy mapy i build frontendu.

Efekt koncowy: aktualna mapa ma wygladac dobrze na istniejacych danych, bez kolejnej rozbudowy produktu.

## Po Tym

1. Przejrzec publiczne UI pod katem powtorzonych opisow, licznikow i lokalnych naglowkow.
2. Przejrzec admin UI pod katem redukcji: zostawic korekty, moderacje i pojedyncze zmiany; nie rozbudowywac paneli pomocniczych.
3. Zrobic jeden pass dokumentacji po zmianach, zamiast utrzymywac rownolegle plany.

## Poza Zakresem

- audio,
- pieczatki,
- platnosci,
- konta uzytkownikow,
- rozbudowane SEO,
- nowe miasta jako aktywne wdrozenie,
- duze nowe funkcje admina,
- pelne galerie albo pelne pamiatki w pierwszym renderze mapy.

Nowa praca wchodzi tylko wtedy, gdy poprawia czytelnosc mapy, pokazanie miejsca albo utrzymanie danych.
