const BASE_MARKER_WIDTH = 64;
const BASE_MARKER_HEIGHT = 52;
const MIN_EDITORIAL_PRIORITY = 0.5;
const MAX_EDITORIAL_PRIORITY = 3;

type MarkerLayoutInput = {
  editorialPriority: number;
  zoom: number;
};

export type PlaceMarkerLayout = {
  height: number;
  priorityScale: number;
  width: number;
  zIndexOffset: number;
  zoomScale: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getPlaceMarkerLayout({ editorialPriority, zoom }: MarkerLayoutInput): PlaceMarkerLayout {
  const safePriority = Number.isFinite(editorialPriority) ? editorialPriority : 1;
  const safeZoom = Number.isFinite(zoom) ? zoom : 13;
  const clampedPriority = clamp(safePriority, MIN_EDITORIAL_PRIORITY, MAX_EDITORIAL_PRIORITY);
  const priorityScale = 1 + ((clampedPriority - 1) / (MAX_EDITORIAL_PRIORITY - 1)) * 0.26;
  const zoomScale = clamp(0.86 + (safeZoom - 12) * 0.08, 0.86, 1.3);
  const scale = priorityScale * zoomScale;

  return {
    height: Math.round(BASE_MARKER_HEIGHT * scale),
    priorityScale,
    width: Math.round(BASE_MARKER_WIDTH * scale),
    zIndexOffset: 500 + Math.round((clampedPriority - 1) * 80),
    zoomScale,
  };
}
