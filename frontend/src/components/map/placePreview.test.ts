import { describe, expect, it } from "vitest";

import type { Photo, PlaceMapPreviewItem } from "../../api/client";
import { findPlaceFanItem, getPlaceFanItems, getPlacePreviewVisual, isMapIconVisualItem } from "./placePreview";

function photo(id: string, role: Photo["role"] = "gallery"): Photo {
  return {
    approved_at: null,
    caption: null,
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    role,
    source: "user_upload",
    status: "approved",
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

function memory(id: string): PlaceMapPreviewItem {
  return {
    approved_at: null,
    caption: "Byłem tutaj",
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/memories/${id}.jpg`,
    kind: "memory",
    role: null,
    source: null,
    thumb_path: `/media/memories/${id}-thumb.jpg`,
  };
}

describe("place preview helpers", () => {
  it("prefers the explicit cover photo", () => {
    const cover = photo("cover");
    const first = photo("first");

    expect(
      getPlacePreviewVisual({
        cover_photo: cover,
        preview_items: [
          {
            ...first,
            kind: "photo" as const,
          },
        ],
      }),
    ).toMatchObject({
      id: "cover",
      kind: "photo",
    });
  });

  it("falls back to the first preview item", () => {
    const first = photo("first");

    expect(
      getPlacePreviewVisual({
        cover_photo: null,
        preview_items: [
          {
            ...first,
            kind: "photo" as const,
          },
        ],
      }),
    ).toMatchObject({
      id: "first",
      kind: "photo",
    });
  });

  it("falls back to the first memory preview", () => {
    const firstMemory = memory("memory-1");

    expect(
      getPlacePreviewVisual({
        cover_photo: null,
        preview_items: [firstMemory],
      }),
    ).toMatchObject({
      id: "memory-1",
      kind: "memory",
    });
  });

  it("keeps photo and memory identities in fan items", () => {
    const firstPhoto = photo("photo-1");
    const firstMemory = memory("memory-1");

    const previewItems = [
      {
        ...firstPhoto,
        kind: "photo" as const,
      },
      firstMemory,
    ];

    expect(getPlaceFanItems({ cover_photo: null, preview_items: previewItems }).map((item) => item.kind)).toEqual([
      "photo",
      "memory",
    ]);
    expect(
      findPlaceFanItem({ cover_photo: null, preview_items: previewItems }, { id: "memory-1", kind: "memory" }),
    ).toMatchObject({
      id: "memory-1",
      kind: "memory",
    });
  });

  it("puts the explicit cover first without duplicating it in fan items", () => {
    const cover = photo("cover", "map_icon");
    const secondPhoto = photo("second-photo");
    const firstMemory = memory("memory-1");

    const previewItems = [
      {
        ...cover,
        kind: "photo" as const,
      },
      {
        ...secondPhoto,
        kind: "photo" as const,
      },
      firstMemory,
    ];

    expect(getPlaceFanItems({ cover_photo: cover, preview_items: previewItems }).map((item) => item.id)).toEqual([
      "cover",
      "second-photo",
      "memory-1",
    ]);
  });

  it("identifies generated map icons as marker-specific visuals", () => {
    const mapIcon = photo("map-icon", "map_icon");
    const galleryPhoto = photo("gallery-photo");

    expect(isMapIconVisualItem({ ...mapIcon, kind: "photo", source: mapIcon })).toBe(true);
    expect(isMapIconVisualItem({ ...galleryPhoto, kind: "photo", source: galleryPhoto })).toBe(false);
  });
});
