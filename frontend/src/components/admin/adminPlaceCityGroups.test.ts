import { describe, expect, it } from "vitest";

import type { AdminPlace, City } from "../../api/types";
import { getPlaceCityGroups, getPlaceStatusGroups } from "./adminPlaceCityGroups";

const WROCLAW: City = {
  default_zoom: 13,
  id: "wroclaw",
  lat: 51.1079,
  lon: 17.0385,
  name: "Wrocław",
  sort_order: 10,
  status: "active",
};

const KRAKOW: City = {
  default_zoom: 13,
  id: "krakow",
  lat: 50.0614,
  lon: 19.9366,
  name: "Kraków",
  sort_order: 20,
  status: "active",
};

function place(id: string, cityId: string, status: AdminPlace["status"] = "draft"): AdminPlace {
  return {
    article_blocks: [],
    category_ids: [],
    city_id: cityId,
    cover_photo_id: null,
    created_at: "",
    description: null,
    id,
    lat: 0,
    local_comment: null,
    lon: 0,
    memory_count: 0,
    photo_count: 0,
    score: 0,
    slug: id,
    status,
    custom_fields: {},
    title: id,
    updated_at: "",
    weight: 0,
  };
}

describe("getPlaceCityGroups", () => {
  it("keeps cities without places visible in the places admin grouping", () => {
    const groups = getPlaceCityGroups([KRAKOW, WROCLAW], [place("p1", "wroclaw")]);

    expect(groups.map((group) => [group.cityId, group.places.map((groupPlace) => groupPlace.id)])).toEqual([
      ["wroclaw", ["p1"]],
      ["krakow", []],
    ]);
  });

  it("keeps places with missing city records visible after configured cities", () => {
    const groups = getPlaceCityGroups([WROCLAW], [place("p1", "missing-city")]);

    expect(groups.map((group) => [group.cityId, group.cityName, group.city?.id ?? null])).toEqual([
      ["wroclaw", "Wrocław", "wroclaw"],
      ["missing-city", "missing-city", null],
    ]);
  });

  it("groups places by editorial status in the visible city order", () => {
    const statusGroups = getPlaceStatusGroups([
      place("archived", "wroclaw", "archived"),
      place("published", "wroclaw", "published"),
      place("draft", "wroclaw", "draft"),
    ]);

    expect(statusGroups.map((group) => [group.status, group.label, group.defaultExpanded, group.places[0].id])).toEqual(
      [
        ["published", "Opublikowane", true, "published"],
        ["draft", "Szkice", false, "draft"],
        ["archived", "Archiwalne", false, "archived"],
      ],
    );
  });
});
