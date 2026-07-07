import { describe, expect, it } from "vitest";

import { hasMapMarkerCollisionOverlaps, resolveMapMarkerCollisions } from "./mapMarkerCollision";
import { limitMapMarkersByResolvedDensity, type MapMarkerSelectionCandidate } from "./mapMarkerSelection";

function marker(index: number, overrides: Partial<MapMarkerSelectionCandidate> = {}): MapMarkerSelectionCandidate {
  return {
    cityId: "wroclaw",
    height: 64,
    id: `marker-${index}`,
    point: { x: 420, y: 320 },
    priority: 10 - index,
    width: 82,
    ...overrides,
  };
}

describe("limitMapMarkersByResolvedDensity", () => {
  it("keeps locally overlapping markers when collision layout can safely place them", () => {
    const markers = Array.from({ length: 6 }, (_, index) => marker(index));
    const selected = limitMapMarkersByResolvedDensity(markers, {
      viewportHeight: 860,
      viewportWidth: 1280,
      zoom: 13,
    });
    const layouts = resolveMapMarkerCollisions(selected, {
      viewportHeight: 860,
      viewportWidth: 1280,
      zoom: 13,
    });

    expect(selected).toHaveLength(6);
    expect(hasMapMarkerCollisionOverlaps(layouts)).toBe(false);
  });

  it("prunes unresolved collision participants until the layout is clean", () => {
    const markers = Array.from({ length: 8 }, (_, index) => marker(index));
    const selected = limitMapMarkersByResolvedDensity(markers, {
      viewportHeight: 420,
      viewportWidth: 520,
      zoom: 8,
    });
    const layouts = resolveMapMarkerCollisions(selected, {
      viewportHeight: 420,
      viewportWidth: 520,
      zoom: 8,
    });

    expect(selected.map((item) => item.id)).toContain("marker-0");
    expect(selected.length).toBeLessThan(markers.length);
    expect(hasMapMarkerCollisionOverlaps(layouts)).toBe(false);
  });

  it("keeps isolated lower-priority markers while pruning only the unresolved crowd", () => {
    const crowdedMarkers = Array.from({ length: 8 }, (_, index) => marker(index));
    const isolatedMarker = marker(8, {
      id: "isolated-detail-place",
      point: { x: 80, y: 70 },
      priority: 0.5,
    });
    const selected = limitMapMarkersByResolvedDensity([...crowdedMarkers, isolatedMarker], {
      viewportHeight: 420,
      viewportWidth: 520,
      zoom: 8,
    });
    const layouts = resolveMapMarkerCollisions(selected, {
      viewportHeight: 420,
      viewportWidth: 520,
      zoom: 8,
    });

    expect(selected.map((item) => item.id)).toContain("isolated-detail-place");
    expect(hasMapMarkerCollisionOverlaps(layouts)).toBe(false);
  });
});
