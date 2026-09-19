import type { PhotoDetailNavigationDirection } from "./photoDetailNavigation";

export type PhotoDetailSwipePoint = {
  clientX: number;
  clientY: number;
};

export type PhotoDetailSwipeStart = PhotoDetailSwipePoint & {
  viewportWidth: number;
};

const MIN_SWIPE_DISTANCE_PX = 48;
const MAX_SWIPE_DISTANCE_PX = 96;
const SWIPE_VIEWPORT_RATIO = 0.12;
const HORIZONTAL_DOMINANCE_RATIO = 1.35;

export function photoDetailSwipeDistanceThreshold(viewportWidth: number) {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return MIN_SWIPE_DISTANCE_PX;
  }

  return Math.min(MAX_SWIPE_DISTANCE_PX, Math.max(MIN_SWIPE_DISTANCE_PX, viewportWidth * SWIPE_VIEWPORT_RATIO));
}

export function photoDetailSwipeDirection(
  start: PhotoDetailSwipeStart,
  end: PhotoDetailSwipePoint,
): PhotoDetailNavigationDirection | null {
  const deltaX = end.clientX - start.clientX;
  const deltaY = end.clientY - start.clientY;
  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);

  if (horizontalDistance < photoDetailSwipeDistanceThreshold(start.viewportWidth)) {
    return null;
  }

  if (horizontalDistance < verticalDistance * HORIZONTAL_DOMINANCE_RATIO) {
    return null;
  }

  return deltaX < 0 ? 1 : -1;
}
