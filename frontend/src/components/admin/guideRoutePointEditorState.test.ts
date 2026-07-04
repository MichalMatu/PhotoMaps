import { describe, expect, it } from "vitest";

import {
  normalizeGuideRoutePoint,
  removeGuideRoutePoint,
  replaceGuideRoutePoint,
  routePointsFromPlaces,
} from "./guideRoutePointEditorState";

describe("guide route point editor state", () => {
  it("builds normalized route points from places", () => {
    expect(
      routePointsFromPlaces([
        { lat: 51.1079123, lon: 17.0385456 },
        { lat: Number.NaN, lon: 17.02 },
        { lat: 51.1099999, lon: 17.0411111 },
      ]),
    ).toEqual([
      { lat: 51.107912, lon: 17.038546 },
      { lat: 51.11, lon: 17.041111 },
    ]);
  });

  it("updates and removes route points immutably", () => {
    const points = [
      { lat: 51.1, lon: 17.1 },
      { lat: 51.2, lon: 17.2 },
    ];

    expect(replaceGuideRoutePoint(points, 1, normalizeGuideRoutePoint(51.3333333, 17.4444444))).toEqual([
      { lat: 51.1, lon: 17.1 },
      { lat: 51.333333, lon: 17.444444 },
    ]);
    expect(removeGuideRoutePoint(points, 0)).toEqual([{ lat: 51.2, lon: 17.2 }]);
    expect(points).toEqual([
      { lat: 51.1, lon: 17.1 },
      { lat: 51.2, lon: 17.2 },
    ]);
  });
});
