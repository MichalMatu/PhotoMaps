# Place Audio Workflow

PhotoMap nie ma osobnego bytu `place_audio`. Dźwięk miejsca jest publicznie odtwarzany jako załącznik audio do reprezentatywnego medium widocznego na mapie: najpierw cover photo, potem pierwsze zdjęcie z galerii, a na końcu pierwsza pamiątka.

Do masowego dopinania nagrań użyj `scripts/sync_place_audio.py`. Skrypt pobiera aktualne miejsca z publicznego endpointu mapy, sprawdza, które mają już audio, dopasowuje lokalne pliki po slugach miejsc i w trybie `--apply` wgrywa je przez admin API.

## Przygotowanie plików

Trzymaj robocze nagrania poza commitem, najlepiej w ignorowanym katalogu `research-exports/`:

```bash
mkdir -p research-exports/place-audio/wroclaw
cp ~/Nagrania/rynek.mp3 research-exports/place-audio/wroclaw/rynek-wroclaw.mp3
cp ~/Nagrania/ostrow.mp3 research-exports/place-audio/wroclaw/ostrow-tumski.mp3
```

Nazwa pliku musi być slugiem miejsca z mapy. Obsługiwane rozszerzenia: `.mp3`, `.m4a`, `.flac`.

## Plan bez wgrywania

```bash
python scripts/sync_place_audio.py \
  --base-url https://photomap.pl \
  --city wroclaw \
  --audio-dir research-exports/place-audio/wroclaw \
  --output research-exports/place-audio/wroclaw-plan.json
```

Najważniejsze statusy:

- `already_has_audio` — miejsce ma już audio w coverze albo podglądzie mapy.
- `missing_audio_file` — miejsce jest na mapie, ale brakuje pliku `{slug}.mp3/.m4a/.flac`.
- `ready` — plik jest znaleziony i można go wgrać.
- `no_media_target` — miejsce nie ma covera, zdjęcia ani pamiątki, do których można przypiąć audio.
- `duplicate_audio_file` — w katalogu jest więcej niż jeden plik dla tego samego sluga.

## Wgrywanie do PhotoMap

```bash
PHOTOMAP_ADMIN_TOKEN="..." python scripts/sync_place_audio.py \
  --apply \
  --base-url https://photomap.pl \
  --city wroclaw \
  --audio-dir research-exports/place-audio/wroclaw \
  --output research-exports/place-audio/wroclaw-upload.json
```

Skrypt wymaga tokena w `PHOTOMAP_ADMIN_TOKEN`, bo używa adminowych endpointów audio. Domyślnie pomija miejsca, które już mają publiczne audio. `--force` podmieni audio także tam, gdzie jest już nagranie.

## Po wgraniu

Sprawdź publiczną mapę i otwórz medium miejsca. Marker albo kafelek galerii z audio powinien mieć oznaczenie audio, a modal zdjęcia/pamiątki powinien pokazać kontrolkę odtwarzania. Przełącznik `Audio` na mapie uruchamia delikatny ambient autoplay tylko po decyzji użytkownika.
