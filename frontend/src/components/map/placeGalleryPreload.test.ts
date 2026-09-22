import { describe, expect, it } from "vitest";

import { uniqueGalleryThumbPaths } from "./placeGalleryPreload";

describe("uniqueGalleryThumbPaths", () => {
  it("deduplicates gallery thumbnails while preserving order", () => {
    expect(
      uniqueGalleryThumbPaths([
        { thumb_path: "/media/a-thumb.jpg" },
        { thumb_path: "/media/b-thumb.jpg" },
        { thumb_path: "/media/a-thumb.jpg" },
      ]),
    ).toEqual(["/media/a-thumb.jpg", "/media/b-thumb.jpg"]);
  });
});
