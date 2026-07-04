import type { PanOptions } from "leaflet";

import type { PlaceMapItem } from "../../api/types";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

export const MAP_PLACE_CENTER_FALLBACK_MS = MAP_DISPLAY_CONFIG.placeCenter.fallbackMs;
export const MAP_PLACE_CENTER_PIXEL_TOLERANCE = MAP_DISPLAY_CONFIG.placeCenter.pixelTolerance;
export const MAP_PLACE_CENTER_PAN_OPTIONS: PanOptions = MAP_DISPLAY_CONFIG.placeCenter.panOptions;
export const MAP_PLACE_CENTER_SNAP_OPTIONS: PanOptions = MAP_DISPLAY_CONFIG.placeCenter.snapOptions;

export function placeCenterLatLng(place: Pick<PlaceMapItem, "lat" | "lon">): [number, number] {
  return [place.lat, place.lon];
}

export function isWithinPlaceCenterTolerance(
  distancePx: number,
  tolerancePx = MAP_PLACE_CENTER_PIXEL_TOLERANCE,
): boolean {
  return distancePx <= tolerancePx;
}
