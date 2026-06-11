import { describe, expect, it } from "vitest";

import type { Memory, Photo } from "../../api/client";
import { findPlaceFanItem, getPlaceFanItems, getPlacePreviewVisual } from "./placePreview";

function photo(id: string): Photo {
  return {
    approved_at: null,
    caption: null,
    created_at: "2026-06-10T00:00:00",
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    role: "gallery",
    source: "user_upload",
    status: "approved",
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

function memory(id: string): Memory {
  return {
    approved_at: null,
    author_city: null,
    author_name: null,
    caption: "Byłem tutaj",
    created_at: "2026-06-10T00:00:00",
    id,
    memory_text: "Krótka myśl z miejsca",
    paid: false,
    place_id: "place-1",
    public_path: `/media/memories/${id}.jpg`,
    share_slug: `${id}-share`,
    status: "approved",
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
            author_city: null,
            author_name: null,
            kind: "photo" as const,
            memory_text: null,
            paid: null,
            share_slug: null,
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
            author_city: null,
            author_name: null,
            kind: "photo" as const,
            memory_text: null,
            paid: null,
            share_slug: null,
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
        preview_items: [{ ...firstMemory, kind: "memory" as const, role: null, source: null }],
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
        author_city: null,
        author_name: null,
        kind: "photo" as const,
        memory_text: null,
        paid: null,
        share_slug: null,
      },
      { ...firstMemory, kind: "memory" as const, role: null, source: null },
    ];

    expect(getPlaceFanItems({ preview_items: previewItems }).map((item) => item.kind)).toEqual(["photo", "memory"]);
    expect(findPlaceFanItem({ preview_items: previewItems }, { id: "memory-1", kind: "memory" })).toMatchObject({
      id: "memory-1",
      kind: "memory",
    });
  });
});
