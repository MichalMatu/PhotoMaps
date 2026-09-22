import { describe, expect, it } from "vitest";

import { isMapAudioTarget, isSameMapAudioTarget, type MapAudioTarget } from "./mapAudioPlayback";

const target: MapAudioTarget = { id: "photo-1", kind: "photo", placeId: "place-1" };

describe("mapAudioPlayback", () => {
  it("matches only the exact playing visual", () => {
    expect(isMapAudioTarget(target, "place-1", { id: "photo-1", kind: "photo" })).toBe(true);
    expect(isMapAudioTarget(target, "place-2", { id: "photo-1", kind: "photo" })).toBe(false);
    expect(isMapAudioTarget(target, "place-1", { id: "photo-2", kind: "photo" })).toBe(false);
    expect(isMapAudioTarget(target, "place-1", { id: "photo-1", kind: "memory" })).toBe(false);
  });

  it("compares playback targets structurally", () => {
    expect(isSameMapAudioTarget(target, { ...target })).toBe(true);
    expect(isSameMapAudioTarget(null, target)).toBe(false);
  });
});
