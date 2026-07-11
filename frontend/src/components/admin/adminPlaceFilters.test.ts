import { describe, expect, it } from "vitest";

import type { AdminPlace } from "../../api/types";
import {
  DEFAULT_ADMIN_PLACE_FILTERS,
  countActiveAdminPlaceModalFilters,
  countActiveAdminPlaceFilters,
  filterAdminPlaces,
  type AdminPlaceFilters,
} from "./adminPlaceFilters";

function place(overrides: Partial<AdminPlace> = {}): AdminPlace {
  return {
    article_blocks: [{ text: "Opis pełny", type: "paragraph" }],
    category_ids: ["classic"],
    city_id: "wroclaw",
    cover_photo_id: "photo-1",
    created_at: "",
    custom_fields: {},
    description: "Opis",
    id: "place-1",
    lat: 51.1,
    local_comment: null,
    lon: 17.03,
    memory_count: 0,
    photo_count: 1,
    score: 1,
    slug: "rynek",
    status: "published",
    title: "Rynek",
    updated_at: "",
    weight: 1,
    ...overrides,
  };
}

function filters(overrides: Partial<AdminPlaceFilters>): AdminPlaceFilters {
  return { ...DEFAULT_ADMIN_PLACE_FILTERS, ...overrides };
}

describe("filterAdminPlaces", () => {
  it("filters by query, city, status, category and completeness", () => {
    const places = [
      place(),
      place({
        article_blocks: [],
        category_ids: ["quiet"],
        city_id: "poznan",
        cover_photo_id: null,
        id: "place-2",
        photo_count: 0,
        slug: "park",
        status: "draft",
        title: "Park",
      }),
    ];

    expect(filterAdminPlaces(places, filters({ query: "ryn" })).map((item) => item.id)).toEqual(["place-1"]);
    expect(filterAdminPlaces(places, filters({ cityId: "poznan", status: "draft" })).map((item) => item.id)).toEqual([
      "place-2",
    ]);
    expect(filterAdminPlaces(places, filters({ status: "draft" })).map((item) => item.id)).toEqual(["place-2"]);
    expect(filterAdminPlaces(places, filters({ categoryId: "quiet", status: "draft" })).map((item) => item.id)).toEqual(
      ["place-2"],
    );
    expect(
      filterAdminPlaces(places, filters({ completeness: "missing-cover", status: "draft" })).map((item) => item.id),
    ).toEqual(["place-2"]);
  });
});

describe("countActiveAdminPlaceFilters", () => {
  it("counts only filters that narrow the list", () => {
    expect(countActiveAdminPlaceFilters(filters({ query: "rynek", categoryId: "classic", status: "draft" }))).toBe(3);
  });

  it("keeps modal filter count aligned with the available filter controls", () => {
    expect(
      countActiveAdminPlaceModalFilters(
        filters({
          categoryId: "quiet",
          cityId: "wroclaw",
        }),
      ),
    ).toBe(2);
  });
});
