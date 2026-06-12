# Plan

PhotoMap ma techniczny szkielet MVP. Teraz priorytetem jest domkniecie pierwszej jakosciowej probki danych dla Wroclawia jako miasta startowego, uzupelnienie coverow i ocena publicznej mapy na realnych danych. Dopiero po tym stroimy Map Experience v1: rozmiary, gestosc, zoom, ranking, wachlarz podgladow, galerie i filtry kategorii. Audio, pieczatki i platnosci zostaja poza aktualnym etapem.

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

Domknac pierwsza realna probke danych na Wroclawiu jako miescie startowym i ocenic mape na tresci, a nie w prozni.

- 10-15 miejsc to probka do strojenia mapy.
- 30-50 miejsc to docelowy zakres MVP dla pierwszego miasta.
- Kolejne miasta naleza do pozniejszego globalnego rollout przez content pipeline.

Warunki najblizszego celu:

- kazde opublikowane miejsce ma sensowny cover,
- kilka miejsc ma 2-4 dodatkowe zdjecia,
- miejsca maja zroznicowane wagi, zeby testowac ranking i rozmiary markerow,
- statusy `published`/`draft` odpowiadaja realnej gotowosci,
- po imporcie albo korektach sprawdzamy publiczna mape.

## 3. Iteracja 1: Content Sample / Cover Pass

Zbudowac material do oceny mapy.

- Przejrzec manifest Wroclawia.
- Potwierdzic 10-15 miejsc jako probke do strojenia.
- Dodac albo zaimportowac covery.
- Kilka miejsc wzbogacic dodatkowymi zdjeciami.
- Sprawdzic statusy `published`/`draft`.
- Ustawic wagi miejsc tak, zeby ranking mial realny material testowy.
- Zrobic backup przed wiekszym importem.
- Uruchomic import, jesli zmiany ida przez manifest.
- Sprawdzic publiczna mape i admin.

Ikony miejsc sa opcjonalna warstwa jakosciowa. Jesli zwykle zdjecie lepiej pokazuje miejsce, moze byc coverem.

## 4. Iteracja 2: Map Experience v1

Stroic zachowanie mapy dopiero na realnych danych.

- Rozmiary markerow na roznych zoomach.
- Gestosc miejsc przy oddaleniu i zblizeniu.
- Zachowanie zoomu.
- Ranking i wybor miejsc widocznych w pierwszej kolejnosci.
- Czy miejsca z wieksza waga sa odpowiednio wybite.
- Czy wachlarz zdjec i pamiatek jest czytelny.
- Czy pierwszy widok mapy daje efekt "chce to sprawdzic".
- Czy potrzebne sa klastry i w jakim zakresie.

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
