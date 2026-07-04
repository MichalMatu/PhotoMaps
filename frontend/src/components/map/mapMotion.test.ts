import { describe, expect, it } from "vitest";

import {
  galleryMotionStyle,
  getPlaceGalleryMotionLayout,
  getPlaceMarkerEnterDelayMs,
  isGalleryMotionItemInsideViewport,
  placeMarkerEnterStyle,
} from "./mapMotion";
import { getPlaceGalleryMaxSize } from "./placeGallerySizing";

function rectanglesForLayout(layout: ReturnType<typeof getPlaceGalleryMotionLayout>) {
  return layout.map((item) => ({
    bottom: item.offset.y + item.height / 2,
    left: item.offset.x - item.width / 2,
    right: item.offset.x + item.width / 2,
    top: item.offset.y - item.height / 2,
  }));
}

function expectRectanglesNotToOverlap(rectangles: ReturnType<typeof rectanglesForLayout>) {
  rectangles.forEach((rectangle, index) => {
    rectangles.slice(index + 1).forEach((nextRectangle) => {
      const overlaps =
        rectangle.left < nextRectangle.right &&
        rectangle.right > nextRectangle.left &&
        rectangle.top < nextRectangle.bottom &&
        rectangle.bottom > nextRectangle.top;

      expect(overlaps).toBe(false);
    });
  });
}

function boundsForLayout(layout: ReturnType<typeof getPlaceGalleryMotionLayout>) {
  const rectangles = rectanglesForLayout(layout);

  return {
    bottom: Math.max(...rectangles.map((rectangle) => rectangle.bottom)),
    left: Math.min(...rectangles.map((rectangle) => rectangle.left)),
    right: Math.max(...rectangles.map((rectangle) => rectangle.right)),
    top: Math.min(...rectangles.map((rectangle) => rectangle.top)),
  };
}

function maxSizeForViewport(viewportWidth: number, viewportHeight: number, itemCount: number) {
  return getPlaceGalleryMaxSize({
    availableHeight: viewportHeight - 56,
    availableWidth: viewportWidth - 56,
    itemCount,
    viewportHeight,
    viewportWidth,
  });
}

describe("map motion helpers", () => {
  it("creates one gallery motion item per visible gallery target", () => {
    const layout = getPlaceGalleryMotionLayout(4);

    expect(layout).toHaveLength(4);
    expect(layout.every((item) => Number.isFinite(item.offset.x) && Number.isFinite(item.offset.y))).toBe(true);
    expect(layout.every((item) => item.width > 0 && item.height > 0)).toBe(true);
  });

  it("keeps gallery delays short and capped for snappy marker expansion", () => {
    const layout = getPlaceGalleryMotionLayout(12);

    expect(layout[0].delayMs).toBe(0);
    expect(layout[1].delayMs).toBe(26);
    expect(layout[layout.length - 1].delayMs).toBe(156);
  });

  it("packs larger gallery sets without overlapping tile rectangles", () => {
    const layout = getPlaceGalleryMotionLayout(15);

    expectRectanglesNotToOverlap(rectanglesForLayout(layout));
  });

  it("keeps the cover tile largest and close to the circular gallery center", () => {
    const layout = getPlaceGalleryMotionLayout(8);
    const cover = layout[0];
    const largestOtherTileArea = Math.max(...layout.slice(1).map((item) => item.width * item.height));

    expect(cover.width * cover.height).toBeGreaterThan(largestOtherTileArea);
    expect(Math.hypot(cover.offset.x, cover.offset.y)).toBeLessThan(12);
  });

  it("keeps circular gallery clouds collision-free for small, medium and large sets", () => {
    for (const itemCount of [4, 15, 30]) {
      const layout = getPlaceGalleryMotionLayout(itemCount, { maxHeight: 560, maxWidth: 700 });

      expectRectanglesNotToOverlap(rectanglesForLayout(layout));
    }
  });

  it("uses square corners when four items surround the central cover", () => {
    const layout = getPlaceGalleryMotionLayout(5, { maxHeight: 700, maxWidth: 700 });
    const quadrants = new Set(layout.slice(1).map((item) => `${Math.sign(item.offset.x)}:${Math.sign(item.offset.y)}`));

    expect(quadrants).toEqual(new Set(["1:-1", "1:1", "-1:1", "-1:-1"]));
  });

  it("scales gallery tiles to the available map space", () => {
    const layout = getPlaceGalleryMotionLayout(30, { maxHeight: 260, maxWidth: 340 });
    const { bottom, left, right, top } = boundsForLayout(layout);

    expect(right - left).toBeLessThanOrEqual(340);
    expect(bottom - top).toBeLessThanOrEqual(260);
  });

  it("uses more of the available screen on larger viewports", () => {
    const mobile = maxSizeForViewport(390, 780, 30);
    const laptop = maxSizeForViewport(1280, 820, 30);
    const desktop = maxSizeForViewport(2048, 1152, 30);
    const largeDesktop = maxSizeForViewport(2560, 1440, 30);

    expect(mobile.maxWidth).toBeLessThan(laptop.maxWidth);
    expect(laptop.maxWidth).toBeLessThan(desktop.maxWidth);
    expect(desktop.maxWidth).toBeLessThan(largeDesktop.maxWidth);
  });

  it("gives dense galleries a larger footprint budget than compact galleries", () => {
    const compact = maxSizeForViewport(2048, 1152, 5);
    const medium = maxSizeForViewport(2048, 1152, 18);
    const dense = maxSizeForViewport(2048, 1152, 42);

    expect(compact.maxWidth).toBeLessThan(medium.maxWidth);
    expect(medium.maxWidth).toBeLessThan(dense.maxWidth);
  });

  it("scales thumbnail sizes with viewport space for the same gallery count", () => {
    const laptopLayout = getPlaceGalleryMotionLayout(30, maxSizeForViewport(1280, 820, 30));
    const desktopLayout = getPlaceGalleryMotionLayout(30, maxSizeForViewport(2048, 1152, 30));
    const largeDesktopLayout = getPlaceGalleryMotionLayout(30, maxSizeForViewport(2560, 1440, 30));

    expect(desktopLayout[0].width).toBeGreaterThan(laptopLayout[0].width);
    expect(largeDesktopLayout[0].width).toBeGreaterThanOrEqual(desktopLayout[0].width);
  });

  it("balances thumbnail sizes for small, medium and large galleries", () => {
    const maxSize = maxSizeForViewport(2048, 1152, 42);
    const compactLayout = getPlaceGalleryMotionLayout(6, maxSize);
    const mediumLayout = getPlaceGalleryMotionLayout(18, maxSize);
    const denseLayout = getPlaceGalleryMotionLayout(42, maxSize);

    expect(compactLayout[0].width).toBeGreaterThan(mediumLayout[0].width);
    expect(mediumLayout[0].width).toBeGreaterThan(denseLayout[0].width);
    expectRectanglesNotToOverlap(rectanglesForLayout(compactLayout));
    expectRectanglesNotToOverlap(rectanglesForLayout(mediumLayout));
    expectRectanglesNotToOverlap(rectanglesForLayout(denseLayout));
  });

  it("keeps dense gallery clouds close to a round footprint", () => {
    const layout = getPlaceGalleryMotionLayout(30, { maxHeight: 520, maxWidth: 520 });
    const { bottom, left, right, top } = boundsForLayout(layout);
    const aspectRatio = (right - left) / (bottom - top);

    expect(aspectRatio).toBeGreaterThanOrEqual(0.82);
    expect(aspectRatio).toBeLessThanOrEqual(1.18);
  });

  it("uses larger tiles for compact galleries and scales them down for dense galleries", () => {
    const compactLayout = getPlaceGalleryMotionLayout(4, { maxHeight: 560, maxWidth: 700 });
    const denseLayout = getPlaceGalleryMotionLayout(30, { maxHeight: 360, maxWidth: 420 });

    expect(compactLayout[0].width).toBeGreaterThanOrEqual(190);
    expect(compactLayout[1].width).toBeGreaterThanOrEqual(130);
    expect(denseLayout[0].width).toBeLessThan(compactLayout[0].width);
    expect(denseLayout[1].width).toBeLessThan(compactLayout[1].width);
  });

  it("returns no layout for an empty gallery", () => {
    expect(getPlaceGalleryMotionLayout(0)).toEqual([]);
  });

  it("serializes gallery motion values as CSS custom properties", () => {
    expect(galleryMotionStyle({ delayMs: 52, height: 44, offset: { x: -12, y: 34 }, width: 58 })).toBe(
      "--gallery-x: -12px; --gallery-y: 34px; --gallery-width: 58px; --gallery-height: 44px; --gallery-delay: 52ms;",
    );
  });

  it("detects gallery tiles that would leave the map viewport", () => {
    const tile = { delayMs: 0, height: 80, offset: { x: 120, y: 0 }, width: 100 };

    expect(
      isGalleryMotionItemInsideViewport(tile, {
        anchorX: 160,
        anchorY: 120,
        viewportHeight: 240,
        viewportWidth: 320,
      }),
    ).toBe(false);
    expect(
      isGalleryMotionItemInsideViewport(tile, {
        anchorX: 140,
        anchorY: 120,
        viewportHeight: 300,
        viewportWidth: 400,
      }),
    ).toBe(true);
  });

  it("keeps marker filter-entry delays short and capped", () => {
    expect(getPlaceMarkerEnterDelayMs(0)).toBe(0);
    expect(getPlaceMarkerEnterDelayMs(2)).toBe(32);
    expect(getPlaceMarkerEnterDelayMs(20)).toBe(144);
  });

  it("serializes marker entry delay as a CSS custom property", () => {
    expect(placeMarkerEnterStyle(3)).toBe("--place-marker-enter-delay: 48ms;");
  });
});
