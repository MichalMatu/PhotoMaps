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
    expect(motionClassName(["pm-sheet", null, undefined, false], false)).toBe("pm-sheet");
    expect(motionClassName(["pm-sheet", "pm-sheet--memory"], true)).toBe("pm-sheet pm-sheet--memory is-exiting");
  });
});
