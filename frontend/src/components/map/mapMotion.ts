const FAN_BASE_RADIUS = 46;
const FAN_MAX_RADIUS = 92;
const FAN_MIN_RADIUS = 58;
const FAN_RADIUS_STEP = 6;
const FAN_STAGGER_MS = 26;
const FAN_MAX_DELAY_MS = 156;
const MARKER_ENTER_STAGGER_MS = 16;
const MARKER_ENTER_MAX_DELAY_MS = 144;

type FanOffset = {
  x: number;
  y: number;
};

export type FanMotionItem = {
  delayMs: number;
  offset: FanOffset;
};

export function getPlaceFanMotionLayout(itemCount: number): FanMotionItem[] {
  if (itemCount <= 0) {
    return [];
  }

  const radius = Math.min(FAN_MAX_RADIUS, Math.max(FAN_MIN_RADIUS, FAN_BASE_RADIUS + itemCount * FAN_RADIUS_STEP));
  const angleStep = itemCount <= 1 ? 0 : Math.PI / Math.max(1, itemCount - 1);
  const startAngle = -Math.PI + (Math.PI - angleStep * (itemCount - 1)) / 2;

  return Array.from({ length: itemCount }, (_, index) => {
    const angle = startAngle + index * angleStep;

    return {
      delayMs: Math.min(index * FAN_STAGGER_MS, FAN_MAX_DELAY_MS),
      offset: {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius) - 12,
      },
    };
  });
}

export function fanMotionStyle({ delayMs, offset }: FanMotionItem) {
  return `--fan-x: ${offset.x}px; --fan-y: ${offset.y}px; --fan-delay: ${delayMs}ms;`;
}

export function getPlaceMarkerEnterDelayMs(index: number) {
  return Math.min(Math.max(0, index) * MARKER_ENTER_STAGGER_MS, MARKER_ENTER_MAX_DELAY_MS);
}

export function placeMarkerEnterStyle(index: number) {
  return `--place-marker-enter-delay: ${getPlaceMarkerEnterDelayMs(index)}ms;`;
}
