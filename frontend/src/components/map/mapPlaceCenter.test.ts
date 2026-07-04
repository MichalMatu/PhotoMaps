import { describe, expect, it } from "vitest";

import {
  isWithinPlaceCenterTolerance,
  MAP_PLACE_CENTER_FALLBACK_MS,
  MAP_PLACE_CENTER_PAN_OPTIONS,
  MAP_PLACE_CENTER_PIXEL_TOLERANCE,
  MAP_PLACE_CENTER_SNAP_OPTIONS,
  placeCenterLatLng,
} from "./mapPlaceCenter";

describe("placeCenterLatLng", () => {
  it("uses place coordinates as the smooth map center target", () => {
    expect(placeCenterLatLng({ lat: 51.1097, lon: 17.0325 })).toEqual([51.1097, 17.0325]);
  });

  it("keeps centering animated without changing zoom", () => {
    expect(MAP_PLACE_CENTER_PAN_OPTIONS).toMatchObject({
      animate: true,
      duration: 0.38,
    });
    expect(MAP_PLACE_CENTER_FALLBACK_MS).toBeGreaterThan(380);
  });

  it("uses a non-animated snap only as the fallback recovery path", () => {
    expect(MAP_PLACE_CENTER_SNAP_OPTIONS).toEqual({ animate: false });
  });
});

describe("isWithinPlaceCenterTolerance", () => {
  it("treats near-centered markers as ready to open immediately", () => {
    expect(isWithinPlaceCenterTolerance(MAP_PLACE_CENTER_PIXEL_TOLERANCE)).toBe(true);
    expect(isWithinPlaceCenterTolerance(MAP_PLACE_CENTER_PIXEL_TOLERANCE + 0.1)).toBe(false);
  });
});
