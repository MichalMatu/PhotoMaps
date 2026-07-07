import { describe, expect, it } from "vitest";

import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

describe("MAP_DISPLAY_CONFIG", () => {
  it("keeps public wheel zoom on the native Leaflet handler", () => {
    expect(MAP_DISPLAY_CONFIG.mapContainer.scrollWheelZoom).toBe(true);
    expect("wheelDebounceTime" in MAP_DISPLAY_CONFIG.mapContainer).toBe(false);
    expect("wheelPxPerZoomLevel" in MAP_DISPLAY_CONFIG.mapContainer).toBe(false);
    expect("zoomAnimation" in MAP_DISPLAY_CONFIG.mapContainer).toBe(false);
  });

  it("keeps public zoom on the stable quarter-step baseline", () => {
    expect(MAP_DISPLAY_CONFIG.mapContainer.zoomDelta).toBe(0.25);
    expect(MAP_DISPLAY_CONFIG.mapContainer.zoomSnap).toBe(0.25);
  });

  it("keeps distant collision drift tight so thumbnails do not jump across the map", () => {
    expect(MAP_DISPLAY_CONFIG.markerCollision.maxDriftByZoom[0]).toEqual({ maxZoom: 9.5, distance: 24 });
    expect(MAP_DISPLAY_CONFIG.markerCollision.maxDriftByZoom[1]).toEqual({ maxZoom: 10.5, distance: 40 });
  });
});
