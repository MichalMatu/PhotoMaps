import { describe, expect, it } from "vitest";

import { fanMotionStyle, getPlaceFanMotionLayout } from "./mapMotion";

describe("map motion helpers", () => {
  it("creates one fan motion item per visible fan target", () => {
    const layout = getPlaceFanMotionLayout(4);

    expect(layout).toHaveLength(4);
    expect(layout.every((item) => Number.isFinite(item.offset.x) && Number.isFinite(item.offset.y))).toBe(true);
  });

  it("keeps fan delays short and capped for snappy marker expansion", () => {
    const layout = getPlaceFanMotionLayout(12);

    expect(layout[0].delayMs).toBe(0);
    expect(layout[1].delayMs).toBe(26);
    expect(layout[layout.length - 1].delayMs).toBe(156);
  });

  it("returns no layout for an empty fan", () => {
    expect(getPlaceFanMotionLayout(0)).toEqual([]);
  });

  it("serializes fan motion values as CSS custom properties", () => {
    expect(fanMotionStyle({ delayMs: 52, offset: { x: -12, y: 34 } })).toBe(
      "--fan-x: -12px; --fan-y: 34px; --fan-delay: 52ms;",
    );
  });
});
