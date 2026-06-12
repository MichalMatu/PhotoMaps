import { describe, expect, it } from "vitest";

import type { Photo } from "../../api/client";
import { sortPlacePhotosForPanel } from "./placePhotoPanelState";

function photo(id: string, status: Photo["status"], createdAt: string): Photo {
  return {
    approved_at: status === "approved" ? createdAt : null,
    caption: id,
    created_at: createdAt,
    id,
    place_id: "place-1",
    public_path: `/media/photos/${id}.jpg`,
    role: "gallery",
    source: "editorial",
    status,
    thumb_path: `/media/photos/${id}-thumb.jpg`,
  };
}

describe("sortPlacePhotosForPanel", () => {
  it("keeps the cover first, then approved photos, then pending and rejected", () => {
    const photos = [
      photo("pending", "pending", "2026-01-04T00:00:00"),
      photo("approved-new", "approved", "2026-01-03T00:00:00"),
      photo("rejected", "rejected", "2026-01-05T00:00:00"),
      photo("cover", "approved", "2026-01-01T00:00:00"),
    ];

    expect(sortPlacePhotosForPanel(photos, "cover").map((item) => item.id)).toEqual([
      "cover",
      "approved-new",
      "pending",
      "rejected",
    ]);
  });
});
