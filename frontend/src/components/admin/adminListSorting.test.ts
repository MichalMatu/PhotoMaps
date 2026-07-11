import { describe, expect, it } from "vitest";

import { sortAdminCategoriesByLabel, sortAdminCitiesByName, sortAdminPlacesByTitle } from "./adminListSorting";

describe("admin list sorting", () => {
  it("sorts cities alphabetically by display name without mutating input", () => {
    const cities = [
      { id: "wroclaw", name: "Wrocław" },
      { id: "krakow", name: "Kraków" },
      { id: "lodz", name: "Łódź" },
    ];

    expect(sortAdminCitiesByName(cities).map((city) => city.id)).toEqual(["krakow", "lodz", "wroclaw"]);
    expect(cities.map((city) => city.id)).toEqual(["wroclaw", "krakow", "lodz"]);
  });

  it("sorts categories alphabetically by label", () => {
    expect(
      sortAdminCategoriesByLabel([
        { id: "viewpoint", label: "Widok" },
        { id: "architecture", label: "Architektura" },
        { id: "coffee", label: "Kawa" },
      ]).map((category) => category.id),
    ).toEqual(["architecture", "coffee", "viewpoint"]);
  });

  it("sorts places alphabetically by title and uses slug/id as stable tie breakers", () => {
    expect(
      sortAdminPlacesByTitle([
        { id: "zoo", slug: "zoo", title: "Zoo" },
        { id: "rynek-b", slug: "rynek-b", title: "Rynek" },
        { id: "arena", slug: "arena", title: "Arena" },
        { id: "rynek-a", slug: "rynek-a", title: "Rynek" },
      ]).map((place) => place.id),
    ).toEqual(["arena", "rynek-a", "rynek-b", "zoo"]);
  });
});
