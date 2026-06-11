# Place Icons

Ikony miejsc to redakcyjne miniatury do mapy: przezroczyste PNG, obrysy budowli, symbole kategorii i spójna ikonografia. Nie są dokumentalnymi zdjęciami.

Prompt i zasady jakości: [docs/image_generation/place-thumbnails.md](../../docs/image_generation/place-thumbnails.md)

## Struktura

```txt
assets/place-icons/
├── 00_inbox/        surowe wyniki z generatora, lokalne i ignorowane przez git
├── 10_candidates/   wybrane warianty do porównania, lokalne i ignorowane przez git
├── 20_approved/     finalne ikony gotowe do użycia lub uploadu
├── 90_archive/      odrzucone/stare warianty, lokalne i ignorowane przez git
└── manifest.csv     indeks miejsc i statusów ikon
```

W katalogach `00_inbox`, `10_candidates` i `90_archive` trzymać pliki per miejsce:

```txt
00_inbox/{place_slug}/place-{place_slug}-icon-v01.png
10_candidates/{place_slug}/place-{place_slug}-icon-v02.png
90_archive/{place_slug}/place-{place_slug}-icon-v00.png
```

Finalne pliki w `20_approved` też układać per miejsce:

```txt
20_approved/{place_slug}/place-{place_slug}-icon-v01.png
```

## Ważne technicznie

Upload zdjęć zachowuje PNG i przezroczystość w publicznej kopii oraz miniaturze. Ikony można więc testowo dodawać przez obecny flow zdjęć miejsca.

Docelowo warto rozważyć osobne pole albo osobny asset ikony miejsca, jeśli ikona ma być traktowana inaczej niż zwykła galeria zdjęć.

## Statusy w manifest.csv

```txt
planned       miejsce wybrane, ikony jeszcze nie ma
generated     są surowe warianty w 00_inbox
candidate     jest wariant w 10_candidates
approved      finalna ikona jest w 20_approved
uploaded      ikona została dodana do aplikacji
rejected      odrzucone, nie używać
```
