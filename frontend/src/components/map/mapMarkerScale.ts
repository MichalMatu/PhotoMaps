import type { AppConfigMapMarkerScale } from "../../api/types";
import { MAX_PLACE_PRIORITY, MIN_PLACE_PRIORITY } from "../../config/placePriority";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const DEFAULT_MARKER_SCALE = MAP_DISPLAY_CONFIG.fallback.emptyCountryMap.marker_scale;
const MARKER_SCALE_CONFIG = MAP_DISPLAY_CONFIG.markerScale;

type MarkerLayoutInput = {
  editorialPriority: number;
  markerScale?: AppConfigMapMarkerScale;
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

function priorityProgress(editorialPriority: number, markerScale: AppConfigMapMarkerScale) {
  const clampedPriority = clamp(editorialPriority, MIN_PLACE_PRIORITY, MAX_PLACE_PRIORITY);
  const linearProgress = (clampedPriority - MIN_PLACE_PRIORITY) / (MAX_PLACE_PRIORITY - MIN_PLACE_PRIORITY);

  return Math.pow(linearProgress, markerScale.priority.curve);
}

export function getPlaceMarkerLayout({
  editorialPriority,
  markerScale = DEFAULT_MARKER_SCALE,
  zoom,
}: MarkerLayoutInput): PlaceMarkerLayout {
  const safePriority = Number.isFinite(editorialPriority) ? editorialPriority : MARKER_SCALE_CONFIG.defaultPriority;
  const safeZoom = Number.isFinite(zoom) ? zoom : MARKER_SCALE_CONFIG.defaultZoom;
  const weightedProgress = priorityProgress(safePriority, markerScale);
  const priorityScale =
    markerScale.priority.min_scale +
    weightedProgress * (markerScale.priority.max_scale - markerScale.priority.min_scale);
  const zoomScale = clamp(
    MARKER_SCALE_CONFIG.zoom.baseScale +
      (safeZoom - MARKER_SCALE_CONFIG.zoom.baseZoom) * MARKER_SCALE_CONFIG.zoom.scalePerZoom,
    MARKER_SCALE_CONFIG.zoom.minScale,
    MARKER_SCALE_CONFIG.zoom.maxScale,
  );
  const scale = clamp(priorityScale * zoomScale, markerScale.min_render_scale, markerScale.max_render_scale);

  return {
    height: Math.round(markerScale.base_size.height * scale),
    priorityScale,
    width: Math.round(markerScale.base_size.width * scale),
    zIndexOffset:
      MARKER_SCALE_CONFIG.zIndexOffset.base + Math.round(weightedProgress * MARKER_SCALE_CONFIG.zIndexOffset.range),
    zoomScale,
  };
}
