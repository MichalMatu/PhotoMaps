# Kierunek produktu

PhotoMap ma być mapą miejsc z klimatem, a nie encyklopedycznym przewodnikiem turystycznym. Wrocław jest pierwszą planszą startową, na której dopracowujemy jakość miejsc, zdjęcia, pamiątki, moderację i pierwsze przewodniki.

Najkrócej:

```txt
Mapa miejsc, gdzie warto zrobić zdjęcie, poczuć klimat miasta, zostawić pamiątkę i później zebrać cyfrową pieczątkę.
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

1. Odchudzić endpoint mapy: zwracać tylko dane potrzebne do pierwszego renderu, czyli `id`, `slug`, `title`, `lat`, `lon`, kategorię, `score`, liczniki i miniaturę okładki.
2. Szczegóły miejsca, zdjęcia, pamiątki i przewodniki ładować dopiero po kliknięciu miejsca.
3. Dopracować dane startowe dla Wrocławia: miejsca, zdjęcia okładkowe, kategorie i krótkie lokalne komentarze.
4. Uporządkować publiczną kartę miejsca tak, żeby zdjęcie, komentarz i pamiątki były ważniejsze niż długi opis.
5. Po domknięciu MVP dodać `AudioClip`: krótkie audio z miejsca, upload, zgoda i moderacja.
6. Potem dodać trasy jako kolekcje punktów z lektorem: `Route` i `RoutePoint`.
7. Na końcu testować pieczątki, share cardy i płatności.

## Przyszły kierunek

Najmocniejsza wersja produktu to:

```txt
spoty do zdjęć + pamiątki ludzi + krótkie audio z miejsca + trasy z lektorem + cyfrowe pieczątki + mapa
```

W UI warto mówić prostym językiem: `pieczątka`, `trasa`, `pamiątka`, `miejsce`, `kolekcja`. Słowo `token` może zostać techniczne, ale nie powinno być głównym językiem użytkownika.
