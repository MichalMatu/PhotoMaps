import { describe, expect, it } from "vitest";

import {
  consumeTrackpadPinchDelta,
  EMPTY_TRACKPAD_PINCH_STATE,
  isTrackpadPinchWheelEvent,
  TRACKPAD_PINCH_ZOOM,
} from "./trackpadZoom";

describe("trackpadZoom", () => {
  it("recognizes pixel-mode ctrl wheel events used by desktop trackpad pinch", () => {
    expect(isTrackpadPinchWheelEvent({ ctrlKey: true, deltaMode: 0 })).toBe(true);
    expect(isTrackpadPinchWheelEvent({ ctrlKey: false, deltaMode: 0 })).toBe(false);
    expect(isTrackpadPinchWheelEvent({ ctrlKey: true, deltaMode: 1 })).toBe(false);
  });

  it("accumulates small pinch deltas before applying one quarter zoom step", () => {
    let state = EMPTY_TRACKPAD_PINCH_STATE;

    for (const deltaY of [-12, -12, -12]) {
      const result = consumeTrackpadPinchDelta(state, deltaY, 100);
      state = result.state;
      expect(result.zoomDelta).toBe(0);
    }

    const result = consumeTrackpadPinchDelta(state, -12, 100);
    expect(result.zoomDelta).toBe(TRACKPAD_PINCH_ZOOM.zoomStep);
    expect(result.state.accumulatedDeltaY).toBe(0);
  });

  it("limits rapid large deltas to one step per cooldown window", () => {
    const first = consumeTrackpadPinchDelta(EMPTY_TRACKPAD_PINCH_STATE, -96, 100);
    expect(first.zoomDelta).toBe(TRACKPAD_PINCH_ZOOM.zoomStep);

    const cooling = consumeTrackpadPinchDelta(first.state, -96, 120);
    expect(cooling.zoomDelta).toBe(0);

    const next = consumeTrackpadPinchDelta(cooling.state, -1, 100 + TRACKPAD_PINCH_ZOOM.cooldownMs);
    expect(next.zoomDelta).toBe(TRACKPAD_PINCH_ZOOM.zoomStep);
  });

  it("drops accumulated momentum when pinch direction changes", () => {
    const inward = consumeTrackpadPinchDelta(EMPTY_TRACKPAD_PINCH_STATE, -24, 100);
    const outward = consumeTrackpadPinchDelta(inward.state, 24, 110);

    expect(outward.zoomDelta).toBe(0);
    expect(outward.state.accumulatedDeltaY).toBe(24);
  });
});
