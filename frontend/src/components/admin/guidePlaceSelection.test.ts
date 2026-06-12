import { describe, expect, it } from "vitest";

import type { Place } from "../../api/client";
import { filterGuidePlaceCandidates, moveGuidePlace, toggleGuidePlaceSelection } from "./guidePlaceSelection";

function place(id: string, title: string): Place {
  return {
    category_ids: [],
    city_id: "wroclaw",
    cover_photo_id: null,
    created_at: "",
    description: null,
    id,
    lat: 51.1,
    local_comment: null,
    lon: 17.03,
    memory_count: 0,
    photo_count: 0,
    score: 0,
    slug: id,
    status: "published",
    title,
    updated_at: "",
    weight: 1,
  };
}

describe("filterGuidePlaceCandidates", () => {
  it("excludes places already in the guide and searches by title or slug", () => {
    const candidates = filterGuidePlaceCandidates(
      [place("rynek", "Rynek"), place("nadodrze", "Nadodrze"), place("zoo", "Zoo")],
      [place("rynek", "Rynek")],
      "nad",
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual(["nadodrze"]);
  });
});

describe("toggleGuidePlaceSelection", () => {
  it("adds and removes selected place ids", () => {
    expect(toggleGuidePlaceSelection(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleGuidePlaceSelection(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("moveGuidePlace", () => {
  it("moves a guide place up or down without leaving the list bounds", () => {
    const places = [place("a", "A"), place("b", "B"), place("c", "C")];

    expect(moveGuidePlace(places, "b", "up").map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(moveGuidePlace(places, "b", "down").map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(moveGuidePlace(places, "a", "up")).toBe(places);
  });
});
