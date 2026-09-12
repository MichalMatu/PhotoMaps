export type TrackpadPinchState = {
  accumulatedDeltaY: number;
  lastStepAt: number | null;
};

export type TrackpadPinchResult = {
  state: TrackpadPinchState;
  zoomDelta: number;
};

const PIXEL_DELTA_MODE = 0;

export const TRACKPAD_PINCH_ZOOM = {
  cooldownMs: 60,
  idleResetMs: 180,
  maxAccumulatedDeltaPx: 96,
  stepDeltaPx: 48,
  zoomStep: 0.25,
} as const;

export const EMPTY_TRACKPAD_PINCH_STATE: TrackpadPinchState = {
  accumulatedDeltaY: 0,
  lastStepAt: null,
};

type TrackpadWheelLike = Pick<WheelEvent, "ctrlKey" | "deltaMode">;

export function isTrackpadPinchWheelEvent(event: TrackpadWheelLike): boolean {
  return event.ctrlKey && event.deltaMode === PIXEL_DELTA_MODE;
}

export function consumeTrackpadPinchDelta(
  state: TrackpadPinchState,
  deltaY: number,
  nowMs: number,
): TrackpadPinchResult {
  if (!Number.isFinite(deltaY) || deltaY === 0) {
    return { state, zoomDelta: 0 };
  }

  const previousDirection = Math.sign(state.accumulatedDeltaY);
  const nextDirection = Math.sign(deltaY);
  const baseDelta = previousDirection !== 0 && previousDirection !== nextDirection ? 0 : state.accumulatedDeltaY;
  const accumulatedDeltaY = Math.max(
    -TRACKPAD_PINCH_ZOOM.maxAccumulatedDeltaPx,
    Math.min(TRACKPAD_PINCH_ZOOM.maxAccumulatedDeltaPx, baseDelta + deltaY),
  );
  const isCoolingDown = state.lastStepAt !== null && nowMs - state.lastStepAt < TRACKPAD_PINCH_ZOOM.cooldownMs;

  if (Math.abs(accumulatedDeltaY) < TRACKPAD_PINCH_ZOOM.stepDeltaPx || isCoolingDown) {
    return { state: { accumulatedDeltaY, lastStepAt: state.lastStepAt }, zoomDelta: 0 };
  }

  const consumedDelta = Math.sign(accumulatedDeltaY) * TRACKPAD_PINCH_ZOOM.stepDeltaPx;
  return {
    state: { accumulatedDeltaY: accumulatedDeltaY - consumedDelta, lastStepAt: nowMs },
    zoomDelta: accumulatedDeltaY < 0 ? TRACKPAD_PINCH_ZOOM.zoomStep : -TRACKPAD_PINCH_ZOOM.zoomStep,
  };
}
