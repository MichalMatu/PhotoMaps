import { describe, expect, it } from "vitest";

import { PLACE_GALLERY_STALE_TIME_MS, placeGalleryQueryOptions } from "./placeGalleryQuery";

describe("placeGalleryQueryOptions", () => {
  it("uses the canonical gallery cache key and stale time", () => {
    const options = placeGalleryQueryOptions("place-7");

    expect(options.queryKey).toEqual(["place", "place-7", "photos"]);
    expect(options.staleTime).toBe(PLACE_GALLERY_STALE_TIME_MS);
  });
});
