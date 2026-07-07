import { describe, expect, it } from "vitest";

import type { AppConfigMapMarkerScale } from "../../api/types";
import { getPlaceMarkerLayout } from "./mapMarkerScale";

describe("getPlaceMarkerLayout", () => {
  it("grows place markers as map zoom increases", () => {
    const lowZoom = getPlaceMarkerLayout({ editorialPriority: 1, zoom: 12 });
    const highZoom = getPlaceMarkerLayout({ editorialPriority: 1, zoom: 17 });

    expect(highZoom.width).toBeGreaterThan(lowZoom.width);
    expect(highZoom.height).toBeGreaterThan(lowZoom.height);
  });

  it("gives higher editorial priority more visual weight at the same zoom", () => {
    const normalPriority = getPlaceMarkerLayout({ editorialPriority: 0.5, zoom: 15 });
    const highPriority = getPlaceMarkerLayout({ editorialPriority: 5, zoom: 15 });

    expect(highPriority.width).toBeGreaterThanOrEqual(normalPriority.width * 2);
    expect(highPriority.height).toBeGreaterThanOrEqual(normalPriority.height * 2);
    expect(highPriority.zIndexOffset).toBeGreaterThan(normalPriority.zIndexOffset);
  });

  it("keeps marker sizes inside the product bounds", () => {
    const smallest = getPlaceMarkerLayout({ editorialPriority: -10, zoom: 1 });
    const largest = getPlaceMarkerLayout({ editorialPriority: 99, zoom: 99 });

    expect(smallest.width).toBe(40);
    expect(smallest.height).toBe(32);
    expect(largest.width).toBe(137);
    expect(largest.height).toBe(110);
  });

  it("keeps default zoom markers compact while making editorial weight visible", () => {
    const lowestPriority = getPlaceMarkerLayout({ editorialPriority: 0.5, zoom: 13 });
    const normalPriority = getPlaceMarkerLayout({ editorialPriority: 1, zoom: 13 });
    const sampleLowPriority = getPlaceMarkerLayout({ editorialPriority: 2.4, zoom: 13 });
    const featuredPriority = getPlaceMarkerLayout({ editorialPriority: 4, zoom: 13 });
    const highPriority = getPlaceMarkerLayout({ editorialPriority: 5, zoom: 13 });

    expect(lowestPriority.width).toBe(49);
    expect(lowestPriority.height).toBe(39);
    expect(normalPriority.width).toBe(56);
    expect(normalPriority.height).toBe(45);
    expect(sampleLowPriority.width).toBe(79);
    expect(sampleLowPriority.height).toBe(64);
    expect(featuredPriority.width).toBe(109);
    expect(featuredPriority.height).toBe(88);
    expect(highPriority.width).toBe(129);
    expect(highPriority.height).toBe(104);
    expect(highPriority.width).toBeGreaterThan(lowestPriority.width * 2);
    expect(highPriority.zIndexOffset - sampleLowPriority.zIndexOffset).toBeGreaterThan(250);
  });

  it("uses runtime map settings for configured tile size and editorial priority scale", () => {
    const markerScale: AppConfigMapMarkerScale = {
      base_size: {
        height: 72,
        width: 96,
      },
      max_render_scale: 2.2,
      min_render_scale: 0.5,
      priority: {
        curve: 0.8,
        max_scale: 2.1,
        min_scale: 0.55,
      },
    };

    const normalPriority = getPlaceMarkerLayout({ editorialPriority: 1, markerScale, zoom: 13 });
    const highPriority = getPlaceMarkerLayout({ editorialPriority: 5, markerScale, zoom: 13 });

    expect(normalPriority.width).toBeGreaterThan(56);
    expect(normalPriority.height).toBeGreaterThan(45);
    expect(highPriority.width).toBeGreaterThan(170);
    expect(highPriority.height).toBeGreaterThan(130);
  });
});
