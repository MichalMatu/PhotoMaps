import { describe, expect, it } from "vitest";

import { placeMarkerOffsetStyle } from "./mapMarkerDisplayOffset";

describe("placeMarkerOffsetStyle", () => {
  it("keeps collision displacement as a visual CSS offset instead of a map position", () => {
    expect(placeMarkerOffsetStyle({ x: 12.4, y: -8.6 })).toBe(
      "--place-marker-offset-x: 12px; --place-marker-offset-y: -9px;",
    );
  });

  it("uses a zero visual offset when the marker stays at its place anchor", () => {
    expect(placeMarkerOffsetStyle(null)).toBe("--place-marker-offset-x: 0px; --place-marker-offset-y: 0px;");
  });
});
