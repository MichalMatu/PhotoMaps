# AGENTS.md - Place Icons

## Purpose

`assets/place-icons` trzyma opcjonalne redakcyjne miniatury miejsc dla PhotoMap: przezroczyste PNG, warianty do review i finalne assety gotowe do importu albo uploadu.

## Ownership

- `00_inbox` trzyma surowe wyniki generatora i jest lokalne.
- `10_review` trzyma warianty do porownania i jest lokalne.
- `20_approved` trzyma finalne ikony gotowe do uzycia w aplikacji.
- `90_archive` trzyma odrzucone albo stare warianty i jest lokalne.
- `manifest.csv` indeksuje status ikon dla miejsc.

## Local Contracts

- Finalna ikona miejsca trafia do `20_approved/{place_slug}/place-{place_slug}-icon-vNN.png`.
- Ikony sa assetami redakcyjnymi, nie dokumentalnymi zdjeciami uzytkownikow.
- Ikony sa opcjonalna warstwa jakosciowa; zwykle zdjecie moze byc lepszym coverem miejsca.
- Zachowuj PNG i przezroczystosc; nie konwertuj ikon do formatu tracacego kanal alpha.
- Status w `manifest.csv` powinien odpowiadac realnemu etapowi assetu.
- Ikony miejsc maja wspierac publiczny efekt mapy miniaturek, nie zastepowac danych miejsca.
- Nie generuj fikcyjnych detali udajacych dokumentalne zdjecia miejsca.

## Work Guidance

- Prompt i kryteria obrazu trzymaj w `docs/image_generation/place-thumbnails.md`.
- Nie importuj surowych wynikow z `00_inbox` do aplikacji bez review.
- Przy zatwierdzaniu ikony sprawdz nazwe pliku, slug miejsca, przezroczystosc i czy asset jest czytelny w malym rozmiarze.
- Przy zmianie workflow ikon zaktualizuj `README.md`, `manifest.csv` i powiazane instrukcje content pipeline.

## Verification

- Sprawdz recznie, czy finalny plik istnieje w `20_approved/{place_slug}`.
- Po imporcie sprawdz publiczna mape i adminowy panel zdjec miejsca.

## Child Index

Brak lokalnych child docs.
