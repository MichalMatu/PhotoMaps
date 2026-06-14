# Plan

PhotoMap ma techniczny szkielet MVP oraz wystarczajaca probke danych do strojenia interfejsu. Aktualnym priorytetem jest Map Experience v1: ocena i dopracowanie rozmiarow markerow, gestosci, zoomu, rankingu oraz wachlarza podgladow na istniejacym datasecie Wroclawia. Audio, pieczatki i platnosci zostaja poza aktualnym etapem.

## 1. Aktualny Stan

- Techniczne MVP jest w wiekszosci zlozone.
- Publiczna mapa dziala i renderuje miniaturowe markery miejsc.
- Admin dziala dla miejsc, kategorii, miast, tras/kolekcji, mediow i zgloszen.
- Upload i moderacja zdjec dzialaja.
- Pamiatki dzialaja z flow dodawania i moderacji.
- Guides/PlaceGuide dzialaja jako techniczny model tras albo kolekcji miejsc.
- Reports dzialaja.
- Content pipeline dziala przez manifest miasta i importer.
- Istnieje manifest Wroclawia z pierwsza paczka miejsc.
- `map preview` juz istnieje: miejsce, city, categories, score/liczniki, cover_photo i preview_items.

## 2. Najblizszy Cel

Domknac Map Experience v1 na istniejacej probce Wroclawia i ustalic zachowanie mapy przed rozszerzaniem datasetu.

- 14 miejsc Wroclawia tworzy aktualna probke do strojenia mapy.
- 30-50 miejsc to docelowy zakres MVP dla pierwszego miasta.
- Kolejne miasta naleza do pozniejszego globalnego rollout przez content pipeline.

Najblizsze pytania produktowe:

- czy markery pozostaja czytelne przy roznych poziomach zoomu,
- czy gestosc i nakladanie miniaturek wymagaja selekcji albo klastrow,
- czy miejsca z wyzsza waga sa wystarczajaco wyroznione,
- czy wachlarz zdjec i pamiatek jest czytelny,
- czy pierwszy widok mapy prowadzi wzrok do najwazniejszych miejsc.

## 3. Iteracja 1: Content Sample / Cover Pass - Zakonczona

Aktualny stan lokalnej bazy dla Wroclawia:

- 14 opublikowanych miejsc,
- komplet poprawnych coverow,
- 2-3 zatwierdzone zdjecia na kazde miejsce,
- zroznicowane wagi miejsc od 1.7 do 3.0,
- 7 zatwierdzonych pamiatek przypietych do 5 miejsc,
- 3 opublikowane trasy,
- zgodne liczniki mediow i komplet plikow w storage.

Ta probka wystarcza do technicznego strojenia mapy. Nie dodawac kolejnych dummy zdjec bez konkretnego scenariusza testowego. Docelowa jakosc redakcyjna coverow pozostaje osobnym zadaniem przed publicznym uruchomieniem miasta.

## 4. Iteracja 2: Map Experience v1 - Aktywna

Stroic zachowanie mapy na aktualnej probce danych.

- Rozmiary markerow na roznych zoomach.
- Gestosc miejsc przy oddaleniu i zblizeniu.
- Zachowanie zoomu.
- Ranking i wybor miejsc widocznych w pierwszej kolejnosci.
- Czy miejsca z wieksza waga sa odpowiednio wybite.
- Czy wachlarz zdjec i pamiatek jest czytelny.
- Miniatura wachlarza otwiera bezposrednio jeden lekki modal medium z jednym kompaktowym blokiem tekstu; bez posredniego podgladu tego samego zdjecia.
- Czy pierwszy widok mapy daje efekt "chce to sprawdzic".
- Czy potrzebne sa klastry i w jakim zakresie.

Najblizszy konkretny krok: audyt gestosci i kolizji markerow na kolejnych poziomach zoomu, a nastepnie decyzja, czy wystarczy selekcja miejsc wedlug rankingu, czy potrzebne sa lekkie klastry miniaturek.

Nie zmieniac fundamentu danych, jesli obecny flow wystarcza do budowania probki.

## 5. Iteracja 3: Warstwy I Kategorie

Ustabilizowac sposob ogladania danych bez zamiany mapy w zwykly panel filtrow.

- Obecnie sa podstawowe warstwy.
- Dodac albo ustabilizowac warstwe `Galerie`.
- Dodac dynamiczne filtry kategorii z API.
- Nie hardkodowac kategorii.
- `Polecane` pozostaje domyslna warstwa oparta o covery i ranking.
- `Galerie` eksponuja miejsca z dodatkowymi zatwierdzonymi zdjeciami poza coverem.
- `Pamiatki` eksponuja miejsca z tresciami typu "bylem tutaj".

Efekt koncowy: uzytkownik moze zmienic sposob ogladania mapy bez utraty wizualnego efektu miniaturek.

## 6. Iteracja 4: Stabilizacja Map Preview

Kontrakt juz istnieje. Celem jest dopracowanie, testy i ewentualne odchudzenie bez utraty wizualnego pierwszego widoku.

`/api/places/map` powinno pozostac lekkim `map preview`:

- dane miejsca,
- miasto i kategorie,
- score,
- liczniki,
- cover,
- kilka kuratorowanych podgladow.

Nie ladowac pelnych galerii i pelnych pamiatek tylko po to, zeby wyrenderowac pierwszy widok mapy. Jednoczesnie nie wolno utracic efektu wizualnej tablicy miniaturek.

## 7. Pozniej

Po ustabilizowaniu mapy i pierwszego miasta:

- `AudioClip`,
- upload i moderacja audio,
- audio-hover po swiadomym wlaczeniu dzwieku,
- `Route`/`RoutePoint`, jesli obecne guides nie wystarcza,
- pieczatki,
- share cardy,
- platnosci.

Nie dodajemy duzych nowych funkcji, dopoki mapa nie dziala dobrze na realnej probce danych.
