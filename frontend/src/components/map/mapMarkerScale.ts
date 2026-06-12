const BASE_MARKER_WIDTH = 64;
const BASE_MARKER_HEIGHT = 52;
const MIN_EDITORIAL_PRIORITY = 0.5;
const MAX_EDITORIAL_PRIORITY = 3;
const MIN_MARKER_SCALE = 0.52;
const MAX_MARKER_SCALE = 1.55;

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
  const priorityScale =
    0.88 + ((clampedPriority - MIN_EDITORIAL_PRIORITY) / (MAX_EDITORIAL_PRIORITY - MIN_EDITORIAL_PRIORITY)) * 0.37;
  const zoomScale = clamp(0.58 + (safeZoom - 11) * 0.13, 0.58, 1.25);
  const scale = clamp(priorityScale * zoomScale, MIN_MARKER_SCALE, MAX_MARKER_SCALE);

  return {
    height: Math.round(BASE_MARKER_HEIGHT * scale),
    priorityScale,
    width: Math.round(BASE_MARKER_WIDTH * scale),
    zIndexOffset: 500 + Math.round((clampedPriority - 1) * 80),
    zoomScale,
  };
}

export function getSquarePlaceMarkerLayout(layout: PlaceMarkerLayout): PlaceMarkerLayout {
  const side = Math.max(layout.width, layout.height);

  return {
    ...layout,
    height: side,
    width: side,
  };
}
