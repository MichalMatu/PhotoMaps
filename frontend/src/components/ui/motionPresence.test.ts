import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getMotionExitDurationMs,
  motionClassName,
  MOTION_EXIT_DURATION_MS,
  MOTION_REDUCED_EXIT_DURATION_MS,
} from "./motionPresence";

describe("motion presence helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps exit timing aligned with the CSS motion token duration", () => {
    expect(getMotionExitDurationMs()).toBe(MOTION_EXIT_DURATION_MS);
  });

  it("shortens deferred unmounting when reduced motion is requested", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: true })),
    });

    expect(getMotionExitDurationMs()).toBe(MOTION_REDUCED_EXIT_DURATION_MS);
  });

  it("adds the exit phase without preserving empty class values", () => {
    expect(motionClassName(["map-photo-viewer", null, undefined, false], false)).toBe("map-photo-viewer");
    expect(motionClassName(["map-photo-viewer", "is-active"], true)).toBe("map-photo-viewer is-active is-exiting");
  });
});
