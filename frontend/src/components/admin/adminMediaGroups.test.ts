import { describe, expect, it } from "vitest";

import type { Category, Photo, Place } from "../../api/client";
import { groupAdminMediaByPlace, selectPhotoAlbumCover } from "./adminMediaGroups";

const category: Category = {
  description: null,
  icon: null,
  id: "shops",
  label: "Sklepy",
  sort_order: 0,
  status: "active",
};

const place: Place = {
  category_id: "shops",
  cover_photo_id: "photo-2",
  created_at: "2026-06-10T00:00:00",
  description: null,
  id: "place-1",
  lat: 51.1,
  local_comment: null,
  lon: 17.1,
  memory_count: 0,
  photo_count: 2,
  score: 2,
  slug: "sklep",
  status: "published",
  title: "Sklep",
  updated_at: "2026-06-10T00:00:00",
  weight: 1,
};

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

describe("groupAdminMediaByPlace", () => {
  it("groups media by place and exposes the place category label", () => {
    expect(
      groupAdminMediaByPlace([photo("photo-1"), photo("photo-2")], [place], [category], selectPhotoAlbumCover),
    ).toMatchObject([
      {
        categoryLabel: "Sklepy",
        coverItem: { id: "photo-2" },
        items: [{ id: "photo-1" }, { id: "photo-2" }],
        title: "Sklep",
      },
    ]);
  });
});
