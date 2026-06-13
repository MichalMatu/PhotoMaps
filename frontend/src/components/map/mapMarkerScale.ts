import { MAX_PLACE_PRIORITY, MIN_PLACE_PRIORITY } from "../../config/placePriority";

const BASE_MARKER_WIDTH = 64;
const BASE_MARKER_HEIGHT = 52;
const MIN_MARKER_SCALE = 0.44;
const MAX_MARKER_SCALE = 1.75;
const MIN_PRIORITY_SCALE = 0.5;
const MAX_PRIORITY_SCALE = 1.75;
const PRIORITY_CURVE = 1.35;

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

function priorityProgress(editorialPriority: number) {
  const clampedPriority = clamp(editorialPriority, MIN_PLACE_PRIORITY, MAX_PLACE_PRIORITY);
  const linearProgress = (clampedPriority - MIN_PLACE_PRIORITY) / (MAX_PLACE_PRIORITY - MIN_PLACE_PRIORITY);

  return Math.pow(linearProgress, PRIORITY_CURVE);
}

export function getPlaceMarkerLayout({ editorialPriority, zoom }: MarkerLayoutInput): PlaceMarkerLayout {
  const safePriority = Number.isFinite(editorialPriority) ? editorialPriority : 1;
  const safeZoom = Number.isFinite(zoom) ? zoom : 13;
  const weightedProgress = priorityProgress(safePriority);
  const priorityScale = MIN_PRIORITY_SCALE + weightedProgress * (MAX_PRIORITY_SCALE - MIN_PRIORITY_SCALE);
  const zoomScale = clamp(0.58 + (safeZoom - 11) * 0.13, 0.58, 1.25);
  const scale = clamp(priorityScale * zoomScale, MIN_MARKER_SCALE, MAX_MARKER_SCALE);

  return {
    height: Math.round(BASE_MARKER_HEIGHT * scale),
    priorityScale,
    width: Math.round(BASE_MARKER_WIDTH * scale),
    zIndexOffset: 500 + Math.round(weightedProgress * 520),
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
