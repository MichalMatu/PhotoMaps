# Place Icons

Ikony miejsc to opcjonalna redakcyjna warstwa jakosciowa dla PhotoMap: przezroczyste PNG, obrysy budowli, symbole kategorii i spojna ikonografia. Nie sa dokumentalnymi zdjeciami i nie blokuja pracy, jesli zwykle zdjecie lepiej pokazuje miejsce jako cover.

Prompt i zasady jakości: [docs/image_generation/place-thumbnails.md](../../docs/image_generation/place-thumbnails.md)

## Struktura

```txt
assets/place-icons/
├── 00_inbox/        surowe wyniki z generatora, lokalne i ignorowane przez git
├── 10_review/       wybrane warianty do porównania, lokalne i ignorowane przez git
├── 20_approved/     finalne ikony gotowe do użycia lub uploadu
├── 90_archive/      odrzucone/stare warianty, lokalne i ignorowane przez git
└── manifest.csv     indeks miejsc i statusów ikon
```

W katalogach `00_inbox`, `10_review` i `90_archive` trzymać pliki per miejsce:

```txt
00_inbox/{place_slug}/place-{place_slug}-icon-v01.png
10_review/{place_slug}/place-{place_slug}-icon-v02.png
90_archive/{place_slug}/place-{place_slug}-icon-v00.png
```

Finalne pliki w `20_approved` też układać per miejsce:

```txt
20_approved/{place_slug}/place-{place_slug}-icon-v01.png
```

## Ważne technicznie

Upload zdjec zachowuje PNG i przezroczystosc w publicznej kopii oraz miniaturze. Ikony mozna wiec testowo dodawac przez obecny flow zdjec miejsca.

Finalne ikony maja wspierac mape miniaturek, nie zastepowac danych miejsca. Nie generuj fikcyjnych detali udajacych dokumentalne zdjecia miejsca.

## Statusy w manifest.csv

```txt
planned       miejsce wybrane, ikony jeszcze nie ma
generated     są surowe warianty w 00_inbox
review        jest wariant w 10_review
approved      finalna ikona jest w 20_approved
uploaded      ikona została dodana do aplikacji
rejected      odrzucone, nie używać
```
