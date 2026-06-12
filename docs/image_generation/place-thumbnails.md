# Miniatury miejsc — prompt docelowy

Dokument opisuje docelowy prompt do generowania spójnych miniatur miejsc używanych jako mapowe covery, markery albo tymczasowe grafiki testowe.

Celem nie jest dokumentalne zdjęcie miejsca, tylko atrakcyjna, czytelna ikonografia: znak klimatu miejsca, widoczny w małym rozmiarze, z wyraźnym pierwszym planem i przezroczystym tłem.

## Kierunek stylistyczny

```txt
editorial map icon + architectural silhouette + transparent PNG
```

Miniatura ma wyglądać jak element spójnego systemu ikon dla mapy miasta: uproszczona bryła, symbol kategorii, fragment architektury albo nastrojowy detal, bez udawania realistycznego zdjęcia.

## Główna zasada

Ikona ma sugerować atmosferę miejsca, a nie dokumentować jego dokładny wygląd.

Jeśli mamy pewne wizualne punkty odniesienia, można je zachować w uproszczonej formie. Jeśli ich nie mamy, nie wolno wymyślać fałszywej fasady, szyldu, układu ulicy ani detali architektonicznych. W takim przypadku należy użyć symbolu kategorii albo nastrojowej sceny inspirowanej Wrocławiem.

## Prompt bazowy

```txt
Create a square transparent-background editorial map icon for a visual city map.

Place:
- name: {PLACE_NAME}
- city: Wrocław, Poland
- category: {CATEGORY}
- visual anchors to preserve: {VISUAL_ANCHORS}
- visual certainty: {VISUAL_CERTAINTY}
- fallback subject if anchors are uncertain: {FALLBACK_SUBJECT}
- mood: {MOOD}
- time of day: {TIME_OF_DAY}

Goal:
Create a beautiful place icon that suggests the atmosphere and category of the place.
It should work as a small map cover or marker, not as a documentary image.

Truthfulness rule:
If the visual anchors are not certain, do not invent a realistic facade, signage, street layout, or architectural details.
Use a stylized category-based symbol or atmospheric local silhouette instead.
The image should feel locally believable, but it must not pretend to be an accurate record of the real place.

Style:
- premium editorial map icon
- consistent icon family style across the whole map
- stylized architectural or category silhouette, not a photograph
- clean line-art outline with subtle filled color accents
- medium-thick readable outline suitable for 64–160 px display
- simplified geometry, low detail, no clutter
- transparent background with real alpha channel
- no background panel, no full-bleed scene, no map pin
- one iconic subject only, readable at small size
- restrained Wrocław-inspired palette: warm brick, muted stone, river blue, soft amber light
- subtle glow or shadow only if it improves separation on a map
- believable local character without pretending to be a documentary photo
- no visible text, no labels, no logos, no watermark
- no fake signage, no invented brand names
- no recognizable close-up faces

Composition:
- square 1:1
- centered subject
- subject occupies about 70–85% of the canvas
- enough safe margin for circular or rounded marker crop
- strong outer silhouette
- clear separation from transparent background
- visually distinct from nearby places on the map
- same level of detail and stroke weight as the rest of the icon set

Output:
- transparent PNG-style place icon
- clean alpha edges
- suitable as a visual marker or cover for an interactive city map
```

## Negative prompt

```txt
photorealistic photo, documentary photo, stock photo, full-bleed background, opaque background, background panel, frame, map pin, UI, phone screenshot, text, captions, labels, logo, watermark, fake shop names, fake street signs, invented facade details, distorted architecture, fake architecture, crowded faces, close-up recognizable people, deformed hands, generic postcard composition, messy collage, oversaturated neon, heavy blur, dark unreadable image, fisheye distortion, low resolution, noisy edges, cut-off subject, too much empty space
```

## Pola do uzupełnienia

```txt
{PLACE_NAME}
Nazwa miejsca, np. Rynek, Pasaż Niepolda, Ostrów Tumski, Hala Targowa.

{CATEGORY}
Kategoria z admina, np. viewpoint, coffee, mural, after_22, food, park, culture, river, hidden_gem.

{VISUAL_ANCHORS}
Pewne elementy wizualne, które można bezpiecznie zachować, np. wieże, most, łuki, obrys kamienic, neony, przejście, mural wall texture.

{VISUAL_CERTAINTY}
high / medium / low

high — miejsce ma znany, charakterystyczny wygląd albo pewne punkty odniesienia.
medium — znamy ogólny typ miejsca, ale nie wszystkie detale.
low — nie mamy pewnego wyglądu miejsca; należy użyć symbolu kategorii lub nastrojowego motywu.

{FALLBACK_SUBJECT}
Bezpieczny temat zastępczy, gdy kotwice wizualne są niepewne, np. coffee cup with Wrocław tenement arch motif, river bridge silhouette, warm bar lights in a narrow passage, stylized mural wall texture.

{MOOD}
Klimat, np. lively, quiet, romantic, rainy, nostalgic, late-night, cozy, elegant, mysterious.

{TIME_OF_DAY}
morning, golden hour, dusk, night, rainy evening.
```

## Reguły dla `visual certainty`

### `high`

Używaj, gdy miejsce ma rozpoznawalny i bezpieczny punkt odniesienia.

Przykłady:

```txt
visual certainty: high
visual anchors to preserve: twin cathedral towers, river island silhouette, old brick and stone atmosphere
fallback subject if anchors are uncertain: simplified church tower silhouette with river-blue accent
```

### `medium`

Używaj, gdy znamy ogólną estetykę miejsca, ale nie chcemy odtwarzać detali.

Przykłady:

```txt
visual certainty: medium
visual anchors to preserve: narrow passage feeling, warm evening lights, subtle neon glow
fallback subject if anchors are uncertain: narrow old-town passage silhouette with amber bar lights
```

### `low`

Używaj, gdy miejsce nie ma pewnego wyglądu albo jest zwykłym lokalem/kategorią.

Przykłady:

```txt
visual certainty: low
visual anchors to preserve: cozy coffee atmosphere, local old-town feeling
fallback subject if anchors are uncertain: warm coffee cup silhouette with Wrocław tenement arch motif
```

## Przykład 1 — miejsce z pewnymi kotwicami wizualnymi

```txt
Create a square transparent-background editorial map icon for a visual city map.

Place:
- name: Ostrów Tumski
- city: Wrocław, Poland
- category: historic_area
- visual anchors to preserve: cathedral tower silhouettes, old stone and brick atmosphere, subtle river island feeling
- visual certainty: high
- fallback subject if anchors are uncertain: simplified gothic church tower silhouette with river-blue accent
- mood: quiet romantic historic atmosphere
- time of day: dusk

Goal:
Create a beautiful place icon that suggests the atmosphere and category of the place.
It should work as a small map cover or marker, not as a documentary image.

Truthfulness rule:
If the visual anchors are not certain, do not invent a realistic facade, signage, street layout, or architectural details.
Use a stylized category-based symbol or atmospheric local silhouette instead.
The image should feel locally believable, but it must not pretend to be an accurate record of the real place.

Style:
- premium editorial map icon
- consistent icon family style across the whole map
- stylized architectural or category silhouette, not a photograph
- clean line-art outline with subtle filled color accents
- medium-thick readable outline suitable for 64–160 px display
- simplified geometry, low detail, no clutter
- transparent background with real alpha channel
- no background panel, no full-bleed scene, no map pin
- one iconic subject only, readable at small size
- restrained Wrocław-inspired palette: warm brick, muted stone, river blue, soft amber light
- subtle glow or shadow only if it improves separation on a map
- believable local character without pretending to be a documentary photo
- no visible text, no labels, no logos, no watermark
- no fake signage, no invented brand names
- no recognizable close-up faces

Composition:
- square 1:1
- centered subject
- subject occupies about 70–85% of the canvas
- enough safe margin for circular or rounded marker crop
- strong outer silhouette
- clear separation from transparent background
- visually distinct from nearby places on the map
- same level of detail and stroke weight as the rest of the icon set

Output:
- transparent PNG-style place icon
- clean alpha edges
- suitable as a visual marker or cover for an interactive city map

Negative prompt:
photorealistic photo, documentary photo, stock photo, full-bleed background, opaque background, background panel, frame, map pin, UI, phone screenshot, text, captions, labels, logo, watermark, fake shop names, fake street signs, invented facade details, distorted architecture, fake architecture, crowded faces, close-up recognizable people, deformed hands, generic postcard composition, messy collage, oversaturated neon, heavy blur, dark unreadable image, fisheye distortion, low resolution, noisy edges, cut-off subject, too much empty space
```

## Przykład 2 — miejsce nocne bez dokumentalnego odtwarzania

```txt
Create a square transparent-background editorial map icon for a visual city map.

Place:
- name: Pasaż Niepolda
- city: Wrocław, Poland
- category: after_22
- visual anchors to preserve: narrow passage silhouette, warm bar lights, subtle neon glow, evening energy without recognizable faces
- visual certainty: medium
- fallback subject if anchors are uncertain: narrow old-town passage silhouette with amber bar lights and soft neon accent
- mood: lively late-night local atmosphere
- time of day: night

Goal:
Create a beautiful place icon that suggests the atmosphere and category of the place.
It should work as a small map cover or marker, not as a documentary image.

Truthfulness rule:
If the visual anchors are not certain, do not invent a realistic facade, signage, street layout, or architectural details.
Use a stylized category-based symbol or atmospheric local silhouette instead.
The image should feel locally believable, but it must not pretend to be an accurate record of the real place.

Style:
- premium editorial map icon
- consistent icon family style across the whole map
- stylized architectural or category silhouette, not a photograph
- clean line-art outline with subtle filled color accents
- medium-thick readable outline suitable for 64–160 px display
- simplified geometry, low detail, no clutter
- transparent background with real alpha channel
- no background panel, no full-bleed scene, no map pin
- one iconic subject only, readable at small size
- restrained Wrocław-inspired palette: warm brick, muted stone, river blue, soft amber light
- subtle glow or shadow only if it improves separation on a map
- believable local character without pretending to be a documentary photo
- no visible text, no labels, no logos, no watermark
- no fake signage, no invented brand names
- no recognizable close-up faces

Composition:
- square 1:1
- centered subject
- subject occupies about 70–85% of the canvas
- enough safe margin for circular or rounded marker crop
- strong outer silhouette
- clear separation from transparent background
- visually distinct from nearby places on the map
- same level of detail and stroke weight as the rest of the icon set

Output:
- transparent PNG-style place icon
- clean alpha edges
- suitable as a visual marker or cover for an interactive city map

Negative prompt:
photorealistic photo, documentary photo, stock photo, full-bleed background, opaque background, background panel, frame, map pin, UI, phone screenshot, text, captions, labels, logo, watermark, fake shop names, fake street signs, invented facade details, distorted architecture, fake architecture, crowded faces, close-up recognizable people, deformed hands, generic postcard composition, messy collage, oversaturated neon, heavy blur, dark unreadable image, fisheye distortion, low resolution, noisy edges, cut-off subject, too much empty space
```

## Przykład 3 — kawiarnia lub lokal o niskiej pewności wizualnej

```txt
Create a square transparent-background editorial map icon for a visual city map.

Place:
- name: Local Coffee Spot
- city: Wrocław, Poland
- category: coffee
- visual anchors to preserve: cozy coffee mood, local old-town feeling, warm interior light
- visual certainty: low
- fallback subject if anchors are uncertain: warm coffee cup silhouette with Wrocław tenement arch motif and soft amber light
- mood: cozy calm morning atmosphere
- time of day: morning

Goal:
Create a beautiful place icon that suggests the atmosphere and category of the place.
It should work as a small map cover or marker, not as a documentary image.

Truthfulness rule:
If the visual anchors are not certain, do not invent a realistic facade, signage, street layout, or architectural details.
Use a stylized category-based symbol or atmospheric local silhouette instead.
The image should feel locally believable, but it must not pretend to be an accurate record of the real place.

Style:
- premium editorial map icon
- consistent icon family style across the whole map
- stylized architectural or category silhouette, not a photograph
- clean line-art outline with subtle filled color accents
- medium-thick readable outline suitable for 64–160 px display
- simplified geometry, low detail, no clutter
- transparent background with real alpha channel
- no background panel, no full-bleed scene, no map pin
- one iconic subject only, readable at small size
- restrained Wrocław-inspired palette: warm brick, muted stone, river blue, soft amber light
- subtle glow or shadow only if it improves separation on a map
- believable local character without pretending to be a documentary photo
- no visible text, no labels, no logos, no watermark
- no fake signage, no invented brand names
- no recognizable close-up faces

Composition:
- square 1:1
- centered subject
- subject occupies about 70–85% of the canvas
- enough safe margin for circular or rounded marker crop
- strong outer silhouette
- clear separation from transparent background
- visually distinct from nearby places on the map
- same level of detail and stroke weight as the rest of the icon set

Output:
- transparent PNG-style place icon
- clean alpha edges
- suitable as a visual marker or cover for an interactive city map

Negative prompt:
photorealistic photo, documentary photo, stock photo, full-bleed background, opaque background, background panel, frame, map pin, UI, phone screenshot, text, captions, labels, logo, watermark, fake shop names, fake street signs, invented facade details, distorted architecture, fake architecture, crowded faces, close-up recognizable people, deformed hands, generic postcard composition, messy collage, oversaturated neon, heavy blur, dark unreadable image, fisheye distortion, low resolution, noisy edges, cut-off subject, too much empty space
```

## Checklist jakości

Przed dodaniem miniatury do miejsca sprawdź:

- czy działa jako mały marker na mapie,
- czy ma prawdziwie przezroczyste tło albo łatwo da się wyciąć do przezroczystości,
- czy główny obiekt jest czytelny w rozmiarze 64–160 px,
- czy ma mocny zewnętrzny obrys,
- czy od razu sugeruje kategorię albo klimat miejsca,
- czy nie zawiera tekstu, logo, szyldów ani wymyślonych nazw,
- czy nie pokazuje rozpoznawalnych twarzy,
- czy nie udaje dokumentalnego zdjęcia,
- czy nie wymyśla fałszywych detali architektury,
- czy pasuje stylem, grubością kreski i poziomem detalu do pozostałych miniatur,
- czy jest wystarczająco różna od ikon pobliskich miejsc na mapie.

## Nazewnictwo plików

```txt
place-{slug}-icon-v01.png
place-{slug}-icon-v02.png
place-{slug}-icon-v03.png
```

Wersje robocze trzymaj poza publicznym storage. Do aplikacji dodawaj tylko wybrane i zaakceptowane miniatury.

## Rekomendacja operacyjna

Dla miejsc z `visual certainty: low` preferuj symbol kategorii zamiast architektury.

Przykłady bezpiecznych fallbacków:

```txt
coffee: coffee cup + Wrocław tenement arch motif
bar / after_22: narrow passage lights + soft amber/neon accent
river: bridge silhouette + river-blue accent
viewpoint: simplified skyline contour + soft golden light
mural: stylized wall texture + paint shape, no readable text
park: old tree silhouette + muted stone path accent
culture: theatre curtain or gallery arch silhouette, no logos
food: plate or doorway silhouette with warm light, no fake signage
hidden_gem: small arched doorway + soft glow, no specific fake facade
```
