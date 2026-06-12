# Miniatury miejsc

Ten dokument opisuje prompt do spójnych miniatur miejsc używanych jako mapowe covery albo tymczasowe grafiki testowe. Celem jest atrakcyjna, czytelna ikonografia na mapie, nie dokumentalne zdjęcie miejsca.

## Zasada

Miniatura ma być ikoną klimatu miejsca. Ma działać w małym rozmiarze, mieć wyraźny pierwszy plan, przezroczyste tło i zachować spójny styl w całym produkcie.

Nie generować fikcyjnych szczegółów udających prawdziwą dokumentację miejsca. Jeśli nie mamy pewnego wizualnego punktu odniesienia, użyć bardziej nastrojowej sceny kategorii niż fałszywej fasady.

Wybrany kierunek stylistyczny:

```txt
editorial map icon + architectural silhouette + transparent PNG
```

To ma być piękny znak miejsca: obrys budowli, charakterystyczna bryła, fragment ulicy albo symbol kategorii z nastrojowym akcentem koloru.

## Prompt bazowy

```txt
Create a square transparent-background editorial map icon for a visual city map.

Place:
- name: {PLACE_NAME}
- city: Wroclaw, Poland
- category: {CATEGORY}
- visual anchors to preserve: {VISUAL_ANCHORS}
- mood: {MOOD}
- time of day: {TIME_OF_DAY}

Style:
- premium editorial map icon
- stylized architectural silhouette, not a photograph
- clean line-art outline with subtle filled color accents
- transparent background with alpha channel
- one iconic subject readable at small map-marker size
- simplified geometry, no clutter, no busy background
- restrained palette inspired by Wroclaw: warm brick, muted stone, river blue, soft amber light
- subtle shadow or glow only if it helps separation on a map
- believable local character without pretending to be a documentary photo
- no visible text, no labels, no logos, no watermark
- no fake signage, no invented brand names
- no recognizable close-up faces

Composition:
- square 1:1
- transparent background
- centered subject with enough margin for circular or rounded marker crop
- strong silhouette and clear outer contour
- works as a 64-160 px thumbnail
- visually distinct from nearby places on the map

Output:
- beautiful transparent PNG-style place icon
- suitable as a visual marker/cover for a place on an interactive map
```

## Pola do uzupełnienia

```txt
{PLACE_NAME}      nazwa miejsca, np. Rynek, Pasaż Niepolda, Ostrów Tumski
{CATEGORY}        kategoria z admina, np. viewpoint, coffee, mural, after_22
{VISUAL_ANCHORS}  pewne elementy wizualne, np. obrys kamienic, neony, most, wieże
{MOOD}            klimat, np. lively, quiet, romantic, rainy, late-night, nostalgic
{TIME_OF_DAY}     morning, golden hour, dusk, night, rainy evening
```

## Negative prompt

```txt
photorealistic photo, documentary photo, stock photo, rectangular full-bleed background,
text, captions, labels, logo, watermark, map pin, UI, phone screenshot,
fake shop names, fake street signs, distorted architecture, fake facade details,
crowded faces, close-up recognizable people, deformed hands,
overly generic stock photo, empty postcard composition,
oversaturated neon, heavy blur, dark unreadable image,
fisheye distortion, low resolution, messy collage, opaque background
```

## Przykład

```txt
Create a square transparent-background editorial map icon for a visual city map.

Place:
- name: Pasaż Niepolda
- city: Wroclaw, Poland
- category: after_22
- visual anchors to preserve: narrow passage silhouette, warm bar lights, subtle neon glow, evening energy without recognizable faces
- mood: lively late-night local atmosphere
- time of day: night

Style:
- premium editorial map icon
- stylized architectural silhouette, not a photograph
- clean line-art outline with subtle filled color accents
- transparent background with alpha channel
- one iconic subject readable at small map-marker size
- simplified geometry, no clutter, no busy background
- restrained palette inspired by Wroclaw: warm brick, muted stone, river blue, soft amber light
- subtle shadow or glow only if it helps separation on a map
- believable local character without pretending to be a documentary photo
- no visible text, no labels, no logos, no watermark
- no fake signage, no invented brand names
- no recognizable close-up faces

Composition:
- square 1:1
- transparent background
- centered subject with enough margin for circular or rounded marker crop
- strong silhouette and clear outer contour
- works as a 64-160 px thumbnail
- visually distinct from nearby places on the map

Output:
- beautiful transparent PNG-style place icon
- suitable as a visual marker/cover for a place on an interactive map
```

## Checklist jakości

Przed dodaniem miniatury do miejsca:

- czy działa jako mały marker na mapie,
- czy ma przezroczyste tło albo da się łatwo wyciąć do przezroczystości,
- czy ma czytelny obrys budowli/symbolu,
- czy od razu sugeruje klimat miejsca,
- czy nie zawiera tekstu, logo ani fałszywych szyldów,
- czy nie pokazuje rozpoznawalnych twarzy,
- czy nie udaje dokumentalnego zdjęcia, jeśli scena jest wygenerowana,
- czy pasuje stylem do pozostałych miniatur.

## Nazewnictwo plików

```txt
place-{slug}-icon-v01.png
place-{slug}-icon-v02.png
```

Wersje robocze trzymać poza publicznym storage. Do aplikacji dodawać tylko wybrane, zaakceptowane miniatury.
