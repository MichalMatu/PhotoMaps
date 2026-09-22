import { describe, expect, it } from "vitest";

import { uniqueGalleryThumbPaths, visiblePlaceCoverThumbPaths } from "./placeGalleryPreload";

describe("gallery thumbnail preload helpers", () => {
  it("deduplicates gallery thumbnails while preserving order", () => {
    expect(
      uniqueGalleryThumbPaths([
        { thumb_path: "/media/a-thumb.jpg" },
        { thumb_path: "/media/b-thumb.jpg" },
        { thumb_path: "/media/a-thumb.jpg" },
      ]),
    ).toEqual(["/media/a-thumb.jpg", "/media/b-thumb.jpg"]);
  });

  it("extracts and deduplicates only the primary visible-place cover thumbnails", () => {
    const previewItem = (id: string, thumbPath: string) => ({
      id,
      place_id: `place-${id}`,
      public_path: `/media/${id}.jpg`,
      thumb_path: thumbPath,
      role: "gallery" as const,
      source: "editorial" as const,
      caption: null,
      attribution_author: null,
      attribution_source_url: null,
      attribution_license: null,
      attribution_license_url: null,
      audio: null,
      created_at: "2026-09-22T00:00:00Z",
      approved_at: "2026-09-22T00:00:00Z",
    });

    expect(
      visiblePlaceCoverThumbPaths([
        { cover_photo: previewItem("cover-a", "/media/a-thumb.jpg"), preview_items: [] },
        { cover_photo: previewItem("cover-b", "/media/b-thumb.jpg"), preview_items: [] },
        { cover_photo: previewItem("cover-a-duplicate", "/media/a-thumb.jpg"), preview_items: [] },
      ]),
    ).toEqual(["/media/a-thumb.jpg", "/media/b-thumb.jpg"]);
  });
});
