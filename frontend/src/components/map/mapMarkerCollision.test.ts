import { describe, expect, it } from "vitest";

import {
  hasMapMarkerCollisionOverlaps,
  mapMarkerCollisionOverlapIds,
  maxMarkerCollisionDrift,
  resolveMapMarkerCollisions,
  type MarkerCollisionLayout,
} from "./mapMarkerCollision";

function marker(index: number, overrides: Partial<Parameters<typeof resolveMapMarkerCollisions>[0][number]> = {}) {
  return {
    height: 64,
    id: `marker-${index}`,
    point: { x: 320, y: 240 },
    priority: 1,
    width: 82,
    ...overrides,
  };
}

function rect(layout: MarkerCollisionLayout, gap = 0) {
  return {
    bottom: layout.point.y + layout.height / 2 + gap,
    left: layout.point.x - layout.width / 2 - gap,
    right: layout.point.x + layout.width / 2 + gap,
    top: layout.point.y - layout.height / 2 - gap,
  };
}

function expectNoOverlaps(layouts: MarkerCollisionLayout[], gap = 0) {
  layouts.forEach((layout, index) => {
    const current = rect(layout, gap);
    layouts.slice(index + 1).forEach((nextLayout) => {
      const next = rect(nextLayout, gap);
      const overlaps =
        current.left < next.right &&
        current.right > next.left &&
        current.top < next.bottom &&
        current.bottom > next.top;

      expect(overlaps).toBe(false);
    });
  });
}

describe("resolveMapMarkerCollisions", () => {
  it("separates markers starting at the same screen point with the configured gap", () => {
    const layouts = resolveMapMarkerCollisions(
      Array.from({ length: 4 }, (_, index) => marker(index)),
      { gap: 10, viewportHeight: 640, viewportWidth: 900, zoom: 13 },
    );

    expect(layouts.every((layout) => layout.isDisplaced)).toBe(true);
    expectNoOverlaps(layouts, 5);
  });

  it("is deterministic for the same inputs", () => {
    const candidates = Array.from({ length: 5 }, (_, index) =>
      marker(index, {
        point: { x: 300 + (index % 2) * 12, y: 240 + (index % 3) * 8 },
        priority: index,
      }),
    );

    expect(resolveMapMarkerCollisions(candidates, { viewportHeight: 620, viewportWidth: 900, zoom: 12 })).toEqual(
      resolveMapMarkerCollisions(candidates, { viewportHeight: 620, viewportWidth: 900, zoom: 12 }),
    );
  });

  it("keeps higher priority markers closer to their true position", () => {
    const layouts = resolveMapMarkerCollisions(
      [marker(0, { id: "high", priority: 50 }), marker(1, { id: "low", priority: 1 })],
      { viewportHeight: 640, viewportWidth: 900, zoom: 11 },
    );
    const highPriority = layouts.find((layout) => layout.id === "high");
    const lowPriority = layouts.find((layout) => layout.id === "low");

    expect(highPriority).toBeDefined();
    expect(lowPriority).toBeDefined();
    expect(Math.hypot(highPriority!.offset.x, highPriority!.offset.y)).toBeLessThan(
      Math.hypot(lowPriority!.offset.x, lowPriority!.offset.y),
    );
  });

  it("keeps very distant zooms tighter and allows more pixel drift near city detail", () => {
    expect(maxMarkerCollisionDrift(8)).toBeLessThan(maxMarkerCollisionDrift(11));
    expect(maxMarkerCollisionDrift(11)).toBeLessThan(maxMarkerCollisionDrift(13));
    expect(maxMarkerCollisionDrift(13)).toBeLessThan(maxMarkerCollisionDrift(15));
  });

  it("keeps resolved marker centers inside the viewport", () => {
    const layouts = resolveMapMarkerCollisions(
      [marker(0, { point: { x: 4, y: 4 } }), marker(1, { point: { x: 8, y: 6 } })],
      { viewportHeight: 360, viewportWidth: 420, zoom: 12 },
    );

    for (const layout of layouts) {
      expect(layout.point.x - layout.width / 2).toBeGreaterThanOrEqual(16);
      expect(layout.point.y - layout.height / 2).toBeGreaterThanOrEqual(16);
      expect(layout.point.x + layout.width / 2).toBeLessThanOrEqual(404);
      expect(layout.point.y + layout.height / 2).toBeLessThanOrEqual(344);
    }
  });

  it("keeps crowded city layouts near their true positions instead of making a detached board", () => {
    const candidates = Array.from({ length: 24 }, (_, index) =>
      marker(index, {
        height: 88 + (index % 3) * 8,
        point: {
          x: 760 + (index % 5) * 76,
          y: 120 + Math.floor(index / 5) * 78,
        },
        priority: 100 - index,
        width: 104 + (index % 4) * 8,
      }),
    );
    const layouts = resolveMapMarkerCollisions(candidates, {
      viewportHeight: 980,
      viewportWidth: 1600,
      zoom: 14,
    });
    const maxOffset = Math.max(...layouts.map((layout) => Math.hypot(layout.offset.x, layout.offset.y)));

    expect(maxOffset).toBeLessThanOrEqual(maxMarkerCollisionDrift(14) + 1);
  });

  it("keeps spread regional markers anchored instead of forcing a dense board", () => {
    const candidates = Array.from({ length: 16 }, (_, index) =>
      marker(index, {
        point: {
          x: 140 + (index % 4) * 360,
          y: 120 + Math.floor(index / 4) * 210,
        },
        priority: 20 - index,
      }),
    );

    const layouts = resolveMapMarkerCollisions(candidates, {
      viewportHeight: 900,
      viewportWidth: 1600,
      zoom: 6,
    });

    expectNoOverlaps(layouts, 10);
    expect(layouts.every((layout) => !layout.isDisplaced)).toBe(true);
  });

  it("reports unresolved visual overlaps after layout", () => {
    const layouts = [
      {
        height: 64,
        id: "left",
        isDisplaced: false,
        offset: { x: 0, y: 0 },
        point: { x: 100, y: 100 },
        width: 82,
      },
      {
        height: 64,
        id: "right",
        isDisplaced: false,
        offset: { x: 0, y: 0 },
        point: { x: 140, y: 100 },
        width: 82,
      },
    ];

    expect(hasMapMarkerCollisionOverlaps(layouts)).toBe(true);
    expect(mapMarkerCollisionOverlapIds(layouts)).toEqual(new Set(["left", "right"]));
    expect(hasMapMarkerCollisionOverlaps([{ ...layouts[0] }, { ...layouts[1], point: { x: 190, y: 100 } }])).toBe(
      false,
    );
  });

  it("does not turn compact regional city representatives into a detached matrix", () => {
    const candidates = Array.from({ length: 16 }, (_, index) =>
      marker(index, {
        point: {
          x: 740 + (index % 4) * 10,
          y: 420 + Math.floor(index / 4) * 10,
        },
        priority: 20 - index,
      }),
    );
    const layouts = resolveMapMarkerCollisions(candidates, {
      viewportHeight: 900,
      viewportWidth: 1600,
      zoom: 8,
    });
    const maxOffset = Math.max(...layouts.map((layout) => Math.hypot(layout.offset.x, layout.offset.y)));

    expect(maxOffset).toBeLessThanOrEqual(maxMarkerCollisionDrift(8) + 1);
  });
});
