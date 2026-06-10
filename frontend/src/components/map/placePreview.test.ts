import { describe, expect, it } from "vitest";

import type { Photo } from "../../api/client";
import { getPlacePreviewPhoto } from "./placePreview";

function photo(id: string): Photo {
  return {
    approved_at: null,
    caption: null,
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    status: "approved",
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

describe("getPlacePreviewPhoto", () => {
  it("prefers the explicit cover photo", () => {
    const cover = photo("cover");
    const first = photo("first");

    expect(getPlacePreviewPhoto({ cover_photo: cover, photos: [first] })).toBe(cover);
  });

  it("falls back to the first photo", () => {
    const first = photo("first");

    expect(getPlacePreviewPhoto({ cover_photo: null, photos: [first] })).toBe(first);
  });
});
