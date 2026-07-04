import { describe, expect, it } from "vitest";

import { isMapKeyboardActivationKey } from "./mapKeyboardActivation";

describe("isMapKeyboardActivationKey", () => {
  it("accepts enter and space for public map marker activation", () => {
    expect(isMapKeyboardActivationKey("Enter")).toBe(true);
    expect(isMapKeyboardActivationKey(" ")).toBe(true);
  });

  it("ignores navigation keys", () => {
    expect(isMapKeyboardActivationKey("Tab")).toBe(false);
    expect(isMapKeyboardActivationKey("ArrowRight")).toBe(false);
  });
});
