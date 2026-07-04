import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const MAP_CLOSE_DRAG_TOLERANCE_PX = MAP_DISPLAY_CONFIG.closeGesture.dragTolerancePx;

export type MapClosePointer = {
  clientX: number;
  clientY: number;
};

export function isMapCloseDragGesture(start: MapClosePointer, current: MapClosePointer): boolean {
  return Math.hypot(current.clientX - start.clientX, current.clientY - start.clientY) > MAP_CLOSE_DRAG_TOLERANCE_PX;
}
