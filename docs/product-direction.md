# Kierunek produktu

PhotoMap ma być wizualną mapą miejsc z klimatem, a nie encyklopedycznym przewodnikiem turystycznym. Wrocław jest pierwszą planszą startową, na której dopracowujemy jakość miejsc, zdjęcia, pamiątki, moderację i pierwsze przewodniki.

Najkrócej:

```txt
Mapa-miniaturowa tablica miejsc, gdzie warto zrobić zdjęcie, poczuć klimat miasta, zostawić pamiątkę i później zebrać cyfrową pieczątkę.
```

## Rdzeń

Głównym bytem systemu jest `place`. Zdjęcia, pamiątki, przewodniki, zgłoszenia, przyszłe audio i pieczątki są przypięte do miejsca albo do kolekcji miejsc.

Produkt powinien odpowiadać na praktyczne pytania użytkownika:

- czy tam będzie dobre zdjęcie,
- jaki jest klimat miejsca,
- co warto wiedzieć przed pójściem,
- co mówią lub pokazują ludzie, którzy już tam byli,
- czy miejsce należy do trasy albo kolekcji,
- czy mogę zostawić po sobie pamiątkę.

## Doświadczenie mapy

Publiczna mapa nie ma być pustą mapą z pinezkami. Po wejściu użytkownik powinien od razu zobaczyć gęstą, atrakcyjną tablicę miniaturek miejsc. Kliknięcie miejsca ma pokazywać więcej, ale nie może być wymagane, żeby mapa była ciekawa.

Zasady:

- publiczne markery to miniatury albo klastry miniaturek, nie zwykłe pinezki,
- jedyna typowa pinezka może zostać w adminie do wyboru lokalizacji miejsca,
- pierwszy render mapy ma zawierać cover i kilka kuratorowanych podglądów, ale nie musi zawierać wszystkich zdjęć i pamiątek,
- zoom steruje gęstością i rozmiarem miniaturek: daleko mniej miejsc i klastry, blisko więcej miejsc i wachlarz po kliknięciu,
- domyślna warstwa ma robić efekt "chcę to sprawdzić", a nie tylko pokazywać komplet rekordów,
- warstwy mapy filtrują sposób oglądania danych, a kategorie pochodzą z admina i nie powinny być hardkodowane w UI.

Planowane audio ma wzmacniać ten efekt: po najechaniu na miniaturę miejsca może cicho i płynnie wchodzić krótki ambient miejsca, jeśli miejsce ma zatwierdzone audio. Trzeba uwzględnić ograniczenia przeglądarek, więc dźwięk może wymagać wcześniejszego włączenia przez użytkownika.

## MVP

Najpierw domykamy jeden dobry pokaz na Wrocławiu:

- 30-50 sensownie wybranych miejsc,
- każde miejsce ma kategorię, opis, lokalny komentarz i pozycję na mapie,
- publiczna mapa pokazuje tylko opublikowane miejsca,
- zdjęcia i pamiątki trafiają do moderacji,
- publicznie widoczne są tylko zatwierdzone materiały,
- admin może zarządzać miejscami, kategoriami, zdjęciami, pamiątkami, przewodnikami i zgłoszeniami,
- ranking korzysta z liczby zdjęć, pamiątek i redakcyjnej wagi miejsca,
- UI nie pokazuje technicznego słowa `weight`.

## Najbliższe kroki

1. Dopracować "Map Experience v1": rozmiary miniaturek, gęstość, zachowanie zoomu, klastry i czytelny wachlarz po kliknięciu.
2. Dodać proste warstwy mapy: domyślne polecane, zdjęcia, pamiątki oraz filtrowanie po kategoriach z admina.
3. Uporządkować kontrakt mapy jako `map preview`: dane pierwszego renderu plus cover i kilka podglądów, bez ładowania pełnych galerii każdego miejsca.
4. Dopracować dane startowe dla Wrocławia: miejsca, zdjęcia okładkowe, kategorie i krótkie lokalne komentarze.
5. Uporządkować publiczną kartę miejsca tak, żeby zdjęcie, komentarz i pamiątki były ważniejsze niż długi opis.
6. Po domknięciu tego zakresu dodać `AudioClip`: krótkie audio z miejsca, upload, zgoda, moderacja i cichy audio-hover na mapie.
7. Potem dodać trasy jako kolekcje punktów z lektorem: `Route` i `RoutePoint`.
8. Na końcu testować pieczątki, share cardy i płatności.

## Przyszły kierunek

Najmocniejsza wersja produktu to:

```txt
spoty do zdjęć + pamiątki ludzi + krótkie audio z miejsca + trasy z lektorem + cyfrowe pieczątki + mapa
```

W UI warto mówić prostym językiem: `pieczątka`, `trasa`, `pamiątka`, `miejsce`, `kolekcja`. Słowo `token` może zostać techniczne, ale nie powinno być głównym językiem użytkownika.
