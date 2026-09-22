from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "frontend/src/components/map/PlaceMarker.tsx"
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    if old not in text:
        raise RuntimeError(f"Expected PlaceMarker snippet not found: {old[:120]!r}")
    text = text.replace(old, new, 1)


replace_once('import { useMemo } from "react";', 'import { useEffect, useMemo, useRef } from "react";')
replace_once(
    '''  const map = useMap();
  const galleryItemCount = galleryItems.length + 1;
''',
    '''  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const galleryItemCount = galleryItems.length + 1;
''',
)
replace_once(
    '''  const markerTitle = place.title;
  const mapSize = map.getSize();
''',
    '''  const markerTitle = place.title;

  useEffect(() => {
    if (isExpanded) {
      return;
    }

    const marker = markerRef.current;
    const element = marker?.getElement();
    if (!marker || !element) {
      return;
    }

    const handlePrefetch = () => onPrefetchGallery();
    const handleFocus = () => {
      onPrefetchGallery();
      marker.openTooltip();
    };
    const handleBlur = () => marker.closeTooltip();

    element.addEventListener("pointerenter", handlePrefetch, { passive: true });
    element.addEventListener("pointerdown", handlePrefetch, { passive: true });
    element.addEventListener("focus", handleFocus);
    element.addEventListener("blur", handleBlur);

    return () => {
      element.removeEventListener("pointerenter", handlePrefetch);
      element.removeEventListener("pointerdown", handlePrefetch);
      element.removeEventListener("focus", handleFocus);
      element.removeEventListener("blur", handleBlur);
    };
  }, [isExpanded, onPrefetchGallery, placeIcon]);

  const mapSize = map.getSize();
''',
)
replace_once(
    '''        alt={`Pokaż media miejsca ${place.title}`}
        icon={placeIcon}
''',
    '''        alt={`Pokaż media miejsca ${place.title}`}
        icon={placeIcon}
        ref={markerRef}
''',
)
replace_once(
    '''        eventHandlers={{
          blur: (event) => (event.target as L.Marker).closeTooltip(),
          click: (event) => {
            stopMarkerClick(event);
            onToggleGallery();
          },
          focus: (event) => {
            onPrefetchGallery();
            (event.target as L.Marker).openTooltip();
          },
          keydown: (event) => activateMarkerFromKeyboard(event, onToggleGallery),
          mousedown: onPrefetchGallery,
          mouseover: onPrefetchGallery,
        }}
''',
    '''        eventHandlers={{
          click: (event) => {
            stopMarkerClick(event);
            onToggleGallery();
          },
          keydown: (event) => activateMarkerFromKeyboard(event, onToggleGallery),
        }}
''',
)

path.write_text(text)
print("Applied Leaflet DOM focus/pointer prefetch fix.")
