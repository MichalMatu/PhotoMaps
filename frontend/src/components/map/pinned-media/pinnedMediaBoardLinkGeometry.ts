import type { PinnedMediaPoint, RectLike } from "./pinnedMediaBoardTypes";

export type PinnedMediaConnectionGeometry = {
  path: string;
  source: PinnedMediaPoint;
  target: PinnedMediaPoint;
};

export function pinnedMediaConnectionGeometry(
  frame: RectLike,
  target: PinnedMediaPoint,
): PinnedMediaConnectionGeometry {
  const source = closestCardEdgePoint(frame, target);
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const distance = Math.hypot(deltaX, deltaY);
  const bend = clamp(distance * 0.18, 36, 140);
  const direction = deltaX >= 0 ? 1 : -1;
  const controlA = {
    x: roundPixel(source.x + deltaX * 0.28 + bend * direction),
    y: roundPixel(source.y + deltaY * 0.18),
  };
  const controlB = {
    x: roundPixel(target.x - deltaX * 0.28 - bend * direction),
    y: roundPixel(target.y - deltaY * 0.18),
  };

  return {
    path: `M ${source.x} ${source.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${roundPixel(
      target.x,
    )} ${roundPixel(target.y)}`,
    source,
    target: {
      x: roundPixel(target.x),
      y: roundPixel(target.y),
    },
  };
}

function closestCardEdgePoint(frame: RectLike, target: PinnedMediaPoint) {
  const left = frame.left;
  const right = frame.left + frame.width;
  const top = frame.top;
  const bottom = frame.top + frame.height;
  const clampedX = clamp(target.x, left, right);
  const clampedY = clamp(target.y, top, bottom);

  if (target.x < left || target.x > right || target.y < top || target.y > bottom) {
    return {
      x: roundPixel(clampedX),
      y: roundPixel(clampedY),
    };
  }

  const edgeDistances = [
    { point: { x: left, y: clampedY }, value: Math.abs(target.x - left) },
    { point: { x: right, y: clampedY }, value: Math.abs(right - target.x) },
    { point: { x: clampedX, y: top }, value: Math.abs(target.y - top) },
    { point: { x: clampedX, y: bottom }, value: Math.abs(bottom - target.y) },
  ];
  const closestEdge = edgeDistances.reduce((bestEdge, edge) => (edge.value < bestEdge.value ? edge : bestEdge));

  return {
    x: roundPixel(closestEdge.point.x),
    y: roundPixel(closestEdge.point.y),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPixel(value: number) {
  return Math.round(value);
}
