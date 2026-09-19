import { describe, expect, it } from "vitest";

import {
  getPlaceMarkerEnterDelayMs,
  getPlaceMarkerMotionSignature,
  getPlaceMarkerMotionState,
  isPlaceMarkerEntering,
  placeMarkerEnterStyle,
} from "./placeMarkerMotion";

function place(id: string, coverId: string | null, previewIds: string[] = []) {
  return {
    cover_photo: coverId ? { id: coverId } : null,
    id,
    preview_items: previewIds.map((previewId) => ({ id: previewId, kind: "photo" })),
  };
}

describe("place marker motion", () => {
  it("preserves the aggregate signature used to refresh the map viewport", () => {
    const first = place("a", "cover-a", ["preview-a"]);
    const second = place("b", null, ["preview-b"]);

    expect(getPlaceMarkerMotionState([first, second]).placesMotionSignature).toBe(
      `${getPlaceMarkerMotionSignature(first)}|${getPlaceMarkerMotionSignature(second)}`,
    );
  });

  it("keeps unchanged marker signatures stable when another place changes", () => {
    const before = getPlaceMarkerMotionState([place("a", "cover-a"), place("b", "cover-b")]);
    const after = getPlaceMarkerMotionState([place("a", "cover-a"), place("b", "cover-b-next")]);

    expect(after.signaturesByPlaceId.get("a")).toBe(before.signaturesByPlaceId.get("a"));
    expect(after.signaturesByPlaceId.get("b")).not.toBe(before.signaturesByPlaceId.get("b"));
    expect(after.placesMotionSignature).not.toBe(before.placesMotionSignature);
  });

  it("animates only new or changed markers after the initial render", () => {
    const before = getPlaceMarkerMotionState([place("a", "cover-a"), place("b", "cover-b")]);
    const after = getPlaceMarkerMotionState([place("a", "cover-a"), place("b", "cover-b-next"), place("c", null)]);

    expect(isPlaceMarkerEntering(null, "a", before.signaturesByPlaceId.get("a") ?? "")).toBe(true);
    expect(isPlaceMarkerEntering(before.signaturesByPlaceId, "a", after.signaturesByPlaceId.get("a") ?? "")).toBe(
      false,
    );
    expect(isPlaceMarkerEntering(before.signaturesByPlaceId, "b", after.signaturesByPlaceId.get("b") ?? "")).toBe(true);
    expect(isPlaceMarkerEntering(before.signaturesByPlaceId, "c", after.signaturesByPlaceId.get("c") ?? "")).toBe(true);
  });

  it("keeps per-place signatures stable when only ordering changes", () => {
    const first = place("a", "cover-a");
    const second = place("b", "cover-b");
    const before = getPlaceMarkerMotionState([first, second]);
    const after = getPlaceMarkerMotionState([second, first]);

    expect(after.signaturesByPlaceId.get("a")).toBe(before.signaturesByPlaceId.get("a"));
    expect(after.signaturesByPlaceId.get("b")).toBe(before.signaturesByPlaceId.get("b"));
    expect(after.placesMotionSignature).not.toBe(before.placesMotionSignature);
  });

  it("keeps marker filter-entry delays short and capped", () => {
    expect(getPlaceMarkerEnterDelayMs(0)).toBe(0);
    expect(getPlaceMarkerEnterDelayMs(2)).toBe(32);
    expect(getPlaceMarkerEnterDelayMs(20)).toBe(144);
  });

  it("serializes marker entry delay as a CSS custom property", () => {
    expect(placeMarkerEnterStyle(3)).toBe("--place-marker-enter-delay: 48ms;");
  });
});
