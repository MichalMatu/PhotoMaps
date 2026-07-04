import { describe, expect, it } from "vitest";

import { isMapCloseDragGesture } from "./mapCloseGesture";

describe("isMapCloseDragGesture", () => {
  it("keeps small pointer movement as a map click", () => {
    expect(isMapCloseDragGesture({ clientX: 100, clientY: 100 }, { clientX: 105, clientY: 104 })).toBe(false);
  });

  it("treats larger pointer movement as a drag gesture", () => {
    expect(isMapCloseDragGesture({ clientX: 100, clientY: 100 }, { clientX: 118, clientY: 106 })).toBe(true);
  });
});
