import { describe, expect, it } from "vitest";

import {
  nextPhotoDetailNavigationItem,
  photoDetailNavigationIndex,
  photoDetailNavigationItems,
} from "./photoDetailNavigation";
import type { PlaceMapVisualItem } from "./placePreview";

function photo(id: string): PlaceMapVisualItem {
  return {
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: null,
    description_blocks: [],
    id,
    kind: "photo",
    public_path: `/media/photos/${id}.jpg`,
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

function memory(id: string): PlaceMapVisualItem {
  return {
    audio: null,
    caption: null,
    id,
    kind: "memory",
    public_path: `/media/memories/${id}.jpg`,
    thumb_path: `/media/memories/${id}-thumb.jpg`,
  };
}

describe("photo detail navigation", () => {
  it("keeps navigation limited to photos", () => {
    expect(
      photoDetailNavigationItems([photo("first"), memory("memory"), photo("second")]).map((item) => item.id),
    ).toEqual(["first", "second"]);
  });

  it("finds the active photo index", () => {
    const items = [photo("first"), photo("second")];

    expect(photoDetailNavigationIndex(items, photo("second"))).toBe(1);
    expect(photoDetailNavigationIndex(items, memory("memory"))).toBe(-1);
  });

  it("wraps next and previous navigation", () => {
    const items = [photo("first"), photo("second"), photo("third")];

    expect(nextPhotoDetailNavigationItem(items, 2, 1)).toMatchObject({ id: "first" });
    expect(nextPhotoDetailNavigationItem(items, 0, -1)).toMatchObject({ id: "third" });
  });

  it("does not navigate without a real multi-photo list", () => {
    expect(nextPhotoDetailNavigationItem([photo("first")], 0, 1)).toBeNull();
    expect(nextPhotoDetailNavigationItem([photo("first"), photo("second")], -1, 1)).toBeNull();
  });
});
