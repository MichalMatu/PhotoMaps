import { describe, expect, it } from "vitest";

import type { AdminPlace } from "../../api/types";
import { getPlaceCompleteness } from "./placeCompleteness";

function place(overrides: Partial<AdminPlace> = {}): AdminPlace {
  return {
    article_blocks: [],
    category_ids: [],
    city_id: "wroclaw",
    cover_photo_id: null,
    created_at: "2026-06-12T00:00:00",
    description: null,
    id: "place-1",
    lat: 51.1079,
    local_comment: null,
    lon: 17.0385,
    memory_count: 0,
    photo_count: 0,
    score: 0,
    slug: "place",
    status: "draft",
    custom_fields: {},
    title: "Place",
    updated_at: "2026-06-12T00:00:00",
    weight: 1,
    ...overrides,
  };
}

describe("getPlaceCompleteness", () => {
  it("marks a place ready when the editorial checklist is complete", () => {
    expect(
      getPlaceCompleteness(
        place({
          category_ids: ["coffee"],
          article_blocks: [{ type: "paragraph", text: "Pełny opis" }],
          cover_photo_id: "photo-1",
          description: "Opis",
          photo_count: 1,
        }),
      ),
    ).toEqual({
      isReady: true,
      missingLabels: [],
      passedCount: 6,
      totalCount: 6,
    });
  });

  it("returns compact missing labels for incomplete places", () => {
    expect(
      getPlaceCompleteness(
        place({
          category_ids: ["coffee"],
          local_comment: "Komentarz",
        }),
      ),
    ).toEqual({
      isReady: false,
      missingLabels: ["cover", "pełny opis", "media"],
      passedCount: 3,
      totalCount: 6,
    });
  });
});
