import { describe, expect, it } from "vitest";

import { getPlaceMarkerLayout, getSquarePlaceMarkerLayout } from "./mapMarkerScale";

describe("getPlaceMarkerLayout", () => {
  it("grows place markers as map zoom increases", () => {
    const lowZoom = getPlaceMarkerLayout({ editorialPriority: 1, zoom: 12 });
    const highZoom = getPlaceMarkerLayout({ editorialPriority: 1, zoom: 17 });

    expect(highZoom.width).toBeGreaterThan(lowZoom.width);
    expect(highZoom.height).toBeGreaterThan(lowZoom.height);
  });

  it("gives higher editorial priority more visual weight at the same zoom", () => {
    const normalPriority = getPlaceMarkerLayout({ editorialPriority: 1, zoom: 15 });
    const highPriority = getPlaceMarkerLayout({ editorialPriority: 3, zoom: 15 });

    expect(highPriority.width).toBeGreaterThan(normalPriority.width);
    expect(highPriority.height).toBeGreaterThan(normalPriority.height);
    expect(highPriority.zIndexOffset).toBeGreaterThan(normalPriority.zIndexOffset);
  });

  it("keeps marker sizes inside the MVP bounds", () => {
    const smallest = getPlaceMarkerLayout({ editorialPriority: -10, zoom: 1 });
    const largest = getPlaceMarkerLayout({ editorialPriority: 99, zoom: 99 });

    expect(smallest.width).toBe(33);
    expect(smallest.height).toBe(27);
    expect(largest.width).toBe(99);
    expect(largest.height).toBe(81);
  });

  it("keeps low-zoom markers compact while preserving editorial weight", () => {
    const normalPriority = getPlaceMarkerLayout({ editorialPriority: 1, zoom: 13 });
    const highPriority = getPlaceMarkerLayout({ editorialPriority: 3, zoom: 13 });

    expect(normalPriority.width).toBe(51);
    expect(normalPriority.height).toBe(42);
    expect(highPriority.width).toBe(67);
    expect(highPriority.height).toBe(55);
  });

  it("can derive a square map icon layout from the weighted marker size", () => {
    const layout = getPlaceMarkerLayout({ editorialPriority: 3, zoom: 15 });
    const squareLayout = getSquarePlaceMarkerLayout(layout);

    expect(squareLayout.width).toBe(squareLayout.height);
    expect(squareLayout.width).toBe(Math.max(layout.width, layout.height));
    expect(squareLayout.zIndexOffset).toBe(layout.zIndexOffset);
  });
});
