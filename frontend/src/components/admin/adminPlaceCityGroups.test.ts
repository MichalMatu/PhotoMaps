import { describe, expect, it } from "vitest";

import type { AdminPlace, City } from "../../api/types";
import { getPlaceCityGroups } from "./adminPlaceCityGroups";

const WROCLAW: City = {
  default_zoom: 13,
  id: "wroclaw",
  lat: 51.1079,
  lon: 17.0385,
  name: "Wrocław",
  region: "Dolnośląskie",
  sort_order: 10,
  status: "active",
};

const KRAKOW: City = {
  default_zoom: 13,
  id: "krakow",
  lat: 50.0614,
  lon: 19.9366,
  name: "Kraków",
  region: "Małopolskie",
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
  it("sorts city groups alphabetically and keeps empty cities visible", () => {
    const groups = getPlaceCityGroups([KRAKOW, WROCLAW], [place("p1", "wroclaw")]);

    expect(groups.map((group) => [group.cityId, group.places.map((groupPlace) => groupPlace.id)])).toEqual([
      ["krakow", []],
      ["wroclaw", ["p1"]],
    ]);
  });

  it("sorts places alphabetically inside a city group", () => {
    const groups = getPlaceCityGroups(
      [WROCLAW],
      [place("zoo", "wroclaw"), place("bar", "wroclaw"), place("arena", "wroclaw")],
    );

    expect(groups[0].places.map((groupPlace) => groupPlace.id)).toEqual(["arena", "bar", "zoo"]);
  });

  it("hides cities without matching places when empty city groups are disabled", () => {
    const groups = getPlaceCityGroups([KRAKOW, WROCLAW], [place("p1", "wroclaw")], {
      includeEmptyCities: false,
    });

    expect(
      groups.map((group) => [group.cityId, group.cityName, group.places.map((groupPlace) => groupPlace.id)]),
    ).toEqual([["wroclaw", "Wrocław", ["p1"]]]);
  });

  it("keeps places with missing city records visible after configured city groups", () => {
    const groups = getPlaceCityGroups([WROCLAW], [place("p1", "missing-city")]);

    expect(groups.map((group) => [group.cityId, group.cityName, group.city?.id ?? null])).toEqual([
      ["wroclaw", "Wrocław", "wroclaw"],
      ["missing-city", "missing-city", null],
    ]);
  });

  it("keeps places with missing city records visible when empty city groups are disabled", () => {
    const groups = getPlaceCityGroups([WROCLAW], [place("p1", "missing-city")], {
      includeEmptyCities: false,
    });

    expect(groups.map((group) => [group.cityId, group.cityName, group.city?.id ?? null])).toEqual([
      ["missing-city", "missing-city", null],
    ]);
  });
});
