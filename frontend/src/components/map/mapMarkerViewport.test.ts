import { describe, expect, it } from "vitest";

import { filterMapMarkersByViewport, isMapMarkerAnchorInViewport } from "./mapMarkerViewport";

describe("map marker viewport helpers", () => {
  it("keeps marker anchors inside the current map viewport", () => {
    const candidates = [
      { id: "inside", point: { x: 120, y: 180 } },
      { id: "left", point: { x: -1, y: 180 } },
      { id: "right", point: { x: 401, y: 180 } },
      { id: "top", point: { x: 120, y: -1 } },
      { id: "bottom", point: { x: 120, y: 301 } },
    ];

    expect(
      filterMapMarkersByViewport(candidates, {
        viewportHeight: 300,
        viewportWidth: 400,
      }).map((candidate) => candidate.id),
    ).toEqual(["inside"]);
  });

  it("can keep near-edge anchors only when explicit padding allows it", () => {
    const candidate = { point: { x: -8, y: 120 } };

    expect(isMapMarkerAnchorInViewport(candidate, { viewportHeight: 300, viewportWidth: 400 })).toBe(false);
    expect(isMapMarkerAnchorInViewport(candidate, { padding: 10, viewportHeight: 300, viewportWidth: 400 })).toBe(true);
  });

  it("rejects invalid projected points", () => {
    expect(
      isMapMarkerAnchorInViewport(
        { point: { x: Number.NaN, y: 100 } },
        {
          viewportHeight: 300,
          viewportWidth: 400,
        },
      ),
    ).toBe(false);
  });
});
