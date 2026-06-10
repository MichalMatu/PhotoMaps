import { afterEach, describe, expect, it, vi } from "vitest";

import { isInteractiveDragTarget } from "./useDraggableWindow";

class FakeElement {
  constructor(private readonly isInteractive: boolean) {}

  closest() {
    return this.isInteractive ? this : null;
  }
}

describe("isInteractiveDragTarget", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats svg icons inside buttons as interactive targets", () => {
    vi.stubGlobal("Element", FakeElement);

    expect(isInteractiveDragTarget(new FakeElement(true) as unknown as EventTarget)).toBe(true);
  });
});
