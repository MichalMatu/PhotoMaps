# Plan działania

Ten plan opisuje najbliższe iteracje. Aktualny priorytet to zbudować realną próbkę danych i dopiero na niej dopracowywać mapę. Mapa już używa miniaturek, więc nie projektujemy w ciemno kolejnych zachowań bez treści.

## Cel najbliższego etapu

Stworzyć podstawę do oceny doświadczenia mapy:

- 10-15 sensownych miejsc we Wrocławiu,
- każde miejsce ma kategorię, opis, lokalny komentarz i pozycję,
- każde opublikowane miejsce ma zatwierdzone zdjęcie główne,
- kilka miejsc ma więcej zdjęć, żeby sprawdzić wachlarz miniatur,
- kilka miejsc ma pamiątki testowe,
- miejsca mają różne priorytety redakcyjne, żeby sprawdzić ranking i rozmiary.

## Iteracja 1: Dane startowe

Najpierw budujemy materiał do testowania mapy.

Do zrobienia:

- wybrać pierwsze 10-15 miejsc,
- przygotować spójne miniatury/ikony według [promptu generowania](docs/image_generation/place-thumbnails.md), jeśli nie mamy jeszcze dobrych zdjęć,
- trzymać robocze i finalne ikony w [assets/place-icons](assets/place-icons/README.md),
- dodać je przez admina,
- przypisać kategorie z panelu admina,
- dodać i zatwierdzić zdjęcia,
- ustawić dobre zdjęcia główne,
- uzupełnić krótkie lokalne komentarze,
- dodać kilka pamiątek testowych,
- sprawdzić, czy publiczna mapa pokazuje tylko `published`.

Efekt końcowy:

```txt
Mapa ma wystarczająco danych, żeby ocenić miniatury, gęstość, zoom i ranking.
```

## Iteracja 2: Map Experience v1

Dopiero na realnych danych dopracowujemy zachowanie mapy.

Do oceny i poprawy:

- rozmiary miniaturek na różnych zoomach,
- gęstość miejsc przy oddaleniu i zbliżeniu,
- klastry i moment ich rozbijania,
- które miejsca pojawiają się wcześniej,
- czy ranking faktycznie wybija najmocniejsze miejsca,
- czy wachlarz po kliknięciu jest czytelny,
- czy mapa po wejściu robi efekt "chcę to sprawdzić".

Nie zmieniać jeszcze moderacji, jeśli obecny flow wystarcza do budowania bazy. Upload zachowuje PNG i przezroczystość, więc ikony można testowo dodawać jako zdjęcia miejsca. Docelowo warto rozważyć osobne pole/asset ikony miejsca, jeśli ikona ma być innym typem treści niż galeria zdjęć.

## Iteracja 3: Warstwy i kategorie

Po dopracowaniu podstawowej mapy dodajemy sterowanie widokiem.

Warstwy:

- `Polecane` jako domyślna warstwa,
- `Galerie`,
- `Pamiątki`,
- później `Audio`,
- później `Trasy`.

Znaczenie warstw:

- `Polecane` pokazuje miejsca przez główne miniatury/covery i ranking redakcyjny,
- `Galerie` mocniej eksponują miejsca z dodatkowymi zatwierdzonymi zdjęciami poza coverem,
- `Pamiątki` eksponują miejsca z treściami typu "byłem tutaj",
- przyszłe `Audio` pokaże miejsca z ambientem albo krótką opowieścią,
- przyszłe `Trasy` pokażą kolekcje punktów do przejścia.

Kategorie:

- pochodzą z admina,
- nie są hardkodowane w UI,
- działają jako filtr miejsc niezależny od warstwy.

Efekt końcowy:

```txt
Użytkownik może zmienić sposób oglądania mapy bez utraty wizualnego efektu miniaturek.
```

## Iteracja 4: Kontrakt mapy

Kiedy będzie jasne, co mapa faktycznie pokazuje, porządkujemy API.

Docelowo `/api/places/map` powinno działać jako `map preview`:

- dane miejsca,
- kategoria,
- score,
- liczniki,
- cover,
- kilka kuratorowanych podglądów.

Nie ładować pełnych galerii i pełnych pamiątek tylko po to, żeby wyrenderować pierwszy widok mapy. Jednocześnie nie wolno utracić efektu wizualnej tablicy miniaturek.

## Później

Po ustabilizowaniu mapy:

- `AudioClip`,
- upload i moderacja audio,
- cichy audio-hover z fade in/fade out po włączeniu dźwięku mapy,
- trasy `Route` i `RoutePoint`,
- pieczątki,
- share cardy,
- płatności.

## Zasada robocza

Nie dodajemy dużych nowych funkcji, dopóki mapa nie działa dobrze na realnej próbce danych. Najbliższy nacisk: dane startowe, potem dopracowanie mapy, potem warstwy.
