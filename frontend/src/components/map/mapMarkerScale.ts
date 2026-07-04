import { MAX_PLACE_PRIORITY, MIN_PLACE_PRIORITY } from "../../config/placePriority";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const MARKER_SCALE_CONFIG = MAP_DISPLAY_CONFIG.markerScale;

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

  return Math.pow(linearProgress, MARKER_SCALE_CONFIG.priority.curve);
}

export function getPlaceMarkerLayout({ editorialPriority, zoom }: MarkerLayoutInput): PlaceMarkerLayout {
  const safePriority = Number.isFinite(editorialPriority) ? editorialPriority : MARKER_SCALE_CONFIG.defaultPriority;
  const safeZoom = Number.isFinite(zoom) ? zoom : MARKER_SCALE_CONFIG.defaultZoom;
  const weightedProgress = priorityProgress(safePriority);
  const priorityScale =
    MARKER_SCALE_CONFIG.priority.minScale +
    weightedProgress * (MARKER_SCALE_CONFIG.priority.maxScale - MARKER_SCALE_CONFIG.priority.minScale);
  const zoomScale = clamp(
    MARKER_SCALE_CONFIG.zoom.baseScale +
      (safeZoom - MARKER_SCALE_CONFIG.zoom.baseZoom) * MARKER_SCALE_CONFIG.zoom.scalePerZoom,
    MARKER_SCALE_CONFIG.zoom.minScale,
    MARKER_SCALE_CONFIG.zoom.maxScale,
  );
  const scale = clamp(priorityScale * zoomScale, MARKER_SCALE_CONFIG.minScale, MARKER_SCALE_CONFIG.maxScale);

  return {
    height: Math.round(MARKER_SCALE_CONFIG.baseSize.height * scale),
    priorityScale,
    width: Math.round(MARKER_SCALE_CONFIG.baseSize.width * scale),
    zIndexOffset:
      MARKER_SCALE_CONFIG.zIndexOffset.base + Math.round(weightedProgress * MARKER_SCALE_CONFIG.zIndexOffset.range),
    zoomScale,
  };
}
