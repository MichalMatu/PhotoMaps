import { describe, expect, it } from "vitest";

import { photoDetailSwipeDirection, photoDetailSwipeDistanceThreshold } from "./photoDetailSwipe";

describe("photo detail swipe", () => {
  it("keeps the swipe threshold usable across phone and fullscreen widths", () => {
    expect(photoDetailSwipeDistanceThreshold(320)).toBe(48);
    expect(photoDetailSwipeDistanceThreshold(800)).toBe(96);
    expect(photoDetailSwipeDistanceThreshold(1600)).toBe(96);
  });

  it("maps horizontal swipes to gallery navigation directions", () => {
    const start = { clientX: 180, clientY: 120, viewportWidth: 360 };

    expect(photoDetailSwipeDirection(start, { clientX: 84, clientY: 128 })).toBe(1);
    expect(photoDetailSwipeDirection(start, { clientX: 268, clientY: 112 })).toBe(-1);
  });

  it("ignores short and mostly vertical pointer movement", () => {
    const start = { clientX: 180, clientY: 120, viewportWidth: 360 };

    expect(photoDetailSwipeDirection(start, { clientX: 146, clientY: 124 })).toBeNull();
    expect(photoDetailSwipeDirection(start, { clientX: 108, clientY: 190 })).toBeNull();
  });
});
