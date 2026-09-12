import { describe, expect, it } from "vitest";

import type { Photo, PlaceMapPhoto, PlaceMapPreviewItem } from "../../api/types";
import { findPlaceGalleryItem, getPlaceGalleryItems, getPlacePreviewVisual } from "./placePreview";

function photo(id: string, role: PlaceMapPhoto["role"] = "gallery"): PlaceMapPhoto {
  return {
    approved_at: null,
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: null,
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    role,
    source: "editorial",
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

function publicPhoto(id: string): Photo {
  return {
    audio: null,
    attribution_author: null,
    attribution_license: null,
    attribution_license_url: null,
    attribution_source_url: null,
    caption: null,
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

function memory(id: string): PlaceMapPreviewItem {
  return {
    approved_at: null,
    audio: null,
    caption: "Byłem tutaj",
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/memories/${id}.jpg`,
    kind: "memory",
    thumb_path: `/media/memories/${id}-thumb.jpg`,
  };
}

describe("place preview helpers", () => {
  it("prefers the explicit cover photo", () => {
    const cover = {
      ...photo("cover"),
      attribution_author: "Marta",
      attribution_license: "CC0",
      attribution_license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
      attribution_source_url: "https://commons.wikimedia.org/wiki/File:Cover.jpg",
    };
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
      attribution_author: "Marta",
      attribution_license: "CC0",
      attribution_license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
      attribution_source_url: "https://commons.wikimedia.org/wiki/File:Cover.jpg",
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

  it("keeps photo and memory identities in gallery items", () => {
    const firstPhoto = photo("photo-1");
    const firstMemory = memory("memory-1");

    const previewItems = [
      {
        ...firstPhoto,
        kind: "photo" as const,
      },
      firstMemory,
    ];

    expect(getPlaceGalleryItems({ cover_photo: null, preview_items: previewItems }).map((item) => item.kind)).toEqual([
      "photo",
      "memory",
    ]);
    expect(
      findPlaceGalleryItem({ cover_photo: null, preview_items: previewItems }, { id: "memory-1", kind: "memory" }),
    ).toMatchObject({
      id: "memory-1",
      kind: "memory",
    });
  });

  it("puts the explicit cover first without duplicating it in gallery items", () => {
    const cover = photo("cover");
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

    expect(getPlaceGalleryItems({ cover_photo: cover, preview_items: previewItems }).map((item) => item.id)).toEqual([
      "cover",
      "second-photo",
      "memory-1",
    ]);
  });

  it("uses the full public photo list for expanded gallery items", () => {
    const cover = photo("cover");
    const previewOnlyPhoto = photo("preview-only");
    const firstMemory = memory("memory-1");
    const fullPhotos = [publicPhoto("cover"), publicPhoto("second-photo"), publicPhoto("third-photo")];

    const previewItems = [
      {
        ...cover,
        kind: "photo" as const,
      },
      {
        ...previewOnlyPhoto,
        kind: "photo" as const,
      },
      firstMemory,
    ];
    const place = { cover_photo: cover, preview_items: previewItems };

    expect(getPlaceGalleryItems(place, fullPhotos).map((item) => item.id)).toEqual([
      "cover",
      "second-photo",
      "third-photo",
      "memory-1",
    ]);
    expect(findPlaceGalleryItem(place, { id: "third-photo", kind: "photo" }, fullPhotos)).toMatchObject({
      id: "third-photo",
      kind: "photo",
    });
  });
});
