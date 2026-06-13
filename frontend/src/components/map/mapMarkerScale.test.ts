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
    const normalPriority = getPlaceMarkerLayout({ editorialPriority: 0.5, zoom: 15 });
    const highPriority = getPlaceMarkerLayout({ editorialPriority: 3, zoom: 15 });

    expect(highPriority.width).toBeGreaterThanOrEqual(normalPriority.width * 3);
    expect(highPriority.height).toBeGreaterThanOrEqual(normalPriority.height * 3);
    expect(highPriority.zIndexOffset).toBeGreaterThan(normalPriority.zIndexOffset);
  });

  it("keeps marker sizes inside the MVP bounds", () => {
    const smallest = getPlaceMarkerLayout({ editorialPriority: -10, zoom: 1 });
    const largest = getPlaceMarkerLayout({ editorialPriority: 99, zoom: 99 });

    expect(smallest.width).toBe(28);
    expect(smallest.height).toBe(23);
    expect(largest.width).toBe(112);
    expect(largest.height).toBe(91);
  });

  it("keeps default zoom markers compact while making editorial weight visible", () => {
    const lowestPriority = getPlaceMarkerLayout({ editorialPriority: 0.5, zoom: 13 });
    const normalPriority = getPlaceMarkerLayout({ editorialPriority: 1, zoom: 13 });
    const sampleLowPriority = getPlaceMarkerLayout({ editorialPriority: 1.7, zoom: 13 });
    const featuredPriority = getPlaceMarkerLayout({ editorialPriority: 2.5, zoom: 13 });
    const highPriority = getPlaceMarkerLayout({ editorialPriority: 3, zoom: 13 });

    expect(lowestPriority.width).toBe(28);
    expect(lowestPriority.height).toBe(23);
    expect(normalPriority.width).toBe(35);
    expect(normalPriority.height).toBe(28);
    expect(sampleLowPriority.width).toBe(52);
    expect(sampleLowPriority.height).toBe(42);
    expect(featuredPriority.width).toBe(77);
    expect(featuredPriority.height).toBe(62);
    expect(highPriority.width).toBe(94);
    expect(highPriority.height).toBe(76);
    expect(highPriority.width).toBeGreaterThan(lowestPriority.width * 3);
    expect(highPriority.zIndexOffset - sampleLowPriority.zIndexOffset).toBeGreaterThan(250);
  });

  it("can derive a square map icon layout from the weighted marker size", () => {
    const layout = getPlaceMarkerLayout({ editorialPriority: 3, zoom: 15 });
    const squareLayout = getSquarePlaceMarkerLayout(layout);

    expect(squareLayout.width).toBe(squareLayout.height);
    expect(squareLayout.width).toBe(Math.max(layout.width, layout.height));
    expect(squareLayout.zIndexOffset).toBe(layout.zIndexOffset);
  });
});
