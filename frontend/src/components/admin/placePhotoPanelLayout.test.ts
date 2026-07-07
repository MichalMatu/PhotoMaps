import { describe, expect, it } from "vitest";

import { placePhotoGridSlotCount, placePhotoModalWidthPx } from "./placePhotoPanelLayout";

describe("placePhotoPanelLayout", () => {
  it("keeps one add slot with a compact minimum and the existing large maximum", () => {
    expect(placePhotoGridSlotCount(0)).toBe(2);
    expect(placePhotoGridSlotCount(1)).toBe(2);
    expect(placePhotoGridSlotCount(2)).toBe(3);
    expect(placePhotoGridSlotCount(3)).toBe(4);
    expect(placePhotoGridSlotCount(4)).toBe(5);
    expect(placePhotoGridSlotCount(12)).toBe(5);
  });

  it("derives modal width from the visible grid slots", () => {
    expect(placePhotoModalWidthPx(1)).toBe(620);
    expect(placePhotoModalWidthPx(2)).toBe(912);
    expect(placePhotoModalWidthPx(3)).toBe(1204);
    expect(placePhotoModalWidthPx(4)).toBe(1520);
    expect(placePhotoModalWidthPx(12)).toBe(1520);
  });
});
