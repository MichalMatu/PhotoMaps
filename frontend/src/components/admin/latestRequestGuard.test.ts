import { describe, expect, it } from "vitest";

import { createLatestRequestGuard } from "./latestRequestGuard";

describe("createLatestRequestGuard", () => {
  it("accepts only the newest started request", () => {
    const guard = createLatestRequestGuard();
    const first = guard.begin();
    const second = guard.begin();

    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it("invalidates an in-flight request when its resource is reset", () => {
    const guard = createLatestRequestGuard();
    const token = guard.begin();

    guard.invalidate();

    expect(guard.isCurrent(token)).toBe(false);
  });
});
