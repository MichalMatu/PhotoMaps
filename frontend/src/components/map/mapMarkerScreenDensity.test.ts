import { describe, expect, it } from "vitest";

import { limitMapMarkersByScreenDensity, type ScreenDensityCandidate } from "./mapMarkerScreenDensity";

function marker(index: number, overrides: Partial<ScreenDensityCandidate> = {}): ScreenDensityCandidate {
  return {
    height: 64,
    id: `marker-${index}`,
    point: { x: index * 120, y: 120 },
    priority: 1,
    width: 82,
    ...overrides,
  };
}

describe("limitMapMarkersByScreenDensity", () => {
  it("keeps naturally separated markers in their original order", () => {
    const markers = Array.from({ length: 4 }, (_, index) => marker(index));

    expect(limitMapMarkersByScreenDensity(markers).map((item) => item.id)).toEqual([
      "marker-0",
      "marker-1",
      "marker-2",
      "marker-3",
    ]);
  });

  it("drops lower-priority markers that already overlap locally", () => {
    const markers = [
      marker(0, { id: "kept", point: { x: 100, y: 100 }, priority: 10 }),
      marker(1, { id: "dropped", point: { x: 112, y: 108 }, priority: 1 }),
      marker(2, { id: "separate", point: { x: 240, y: 100 }, priority: 2 }),
    ];

    expect(limitMapMarkersByScreenDensity(markers).map((item) => item.id)).toEqual(["kept", "separate"]);
  });

  it("keeps nearby markers when the local overlap is still mild", () => {
    const markers = [
      marker(0, { id: "first", point: { x: 100, y: 100 }, priority: 10 }),
      marker(1, { id: "second", point: { x: 150, y: 108 }, priority: 1 }),
    ];

    expect(limitMapMarkersByScreenDensity(markers).map((item) => item.id)).toEqual(["first", "second"]);
  });

  it("uses original order as the stable tie-breaker", () => {
    const markers = [
      marker(0, { point: { x: 100, y: 100 }, priority: 1 }),
      marker(1, { point: { x: 112, y: 108 }, priority: 1 }),
    ];

    expect(limitMapMarkersByScreenDensity(markers).map((item) => item.id)).toEqual(["marker-0"]);
  });
});
