import { describe, expect, it } from "vitest";

import {
  hasPlaceLocationChanged,
  placeLocationAutoSaveLabel,
  placeLocationUpdatePayload,
} from "./placeLocationAutoSave";

describe("place location auto save helpers", () => {
  it("builds a narrow lat/lon update payload", () => {
    expect(placeLocationUpdatePayload({ lat: 51.120668, lon: 17.053395 })).toEqual({
      lat: 51.120668,
      lon: 17.053395,
    });
  });

  it("detects whether the marker position changed", () => {
    expect(hasPlaceLocationChanged({ lat: 51.1, lon: 17.03 }, { lat: 51.1, lon: 17.03 })).toBe(false);
    expect(hasPlaceLocationChanged({ lat: 51.1, lon: 17.03 }, { lat: 51.100001, lon: 17.03 })).toBe(true);
    expect(hasPlaceLocationChanged({ lat: 51.1, lon: 17.03 }, { lat: 51.1, lon: 17.030001 })).toBe(true);
  });

  it("keeps user-facing auto-save status labels explicit", () => {
    expect(placeLocationAutoSaveLabel("idle")).toBeNull();
    expect(placeLocationAutoSaveLabel("saving")).toBe("Zapisywanie pozycji...");
    expect(placeLocationAutoSaveLabel("saved")).toBe("Pozycja zapisana");
    expect(placeLocationAutoSaveLabel("error")).toBe("Nie zapisano pozycji");
  });
});
