import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

import {
  consumeTrackpadPinchDelta,
  EMPTY_TRACKPAD_PINCH_STATE,
  isTrackpadPinchWheelEvent,
  TRACKPAD_PINCH_ZOOM,
  type TrackpadPinchState,
} from "./trackpadZoom";

export function MapTrackpadZoom() {
  const map = useMap();
  const stateRef = useRef<TrackpadPinchState>(EMPTY_TRACKPAD_PINCH_STATE);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const container = map.getContainer();

    const scheduleReset = () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => {
        resetTimerRef.current = null;
        stateRef.current = EMPTY_TRACKPAD_PINCH_STATE;
      }, TRACKPAD_PINCH_ZOOM.idleResetMs);
    };

    const handleWheel = (event: WheelEvent) => {
      if (!isTrackpadPinchWheelEvent(event)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      scheduleReset();

      const result = consumeTrackpadPinchDelta(stateRef.current, event.deltaY, performance.now());
      stateRef.current = result.state;
      if (result.zoomDelta === 0) {
        return;
      }

      const currentZoom = map.getZoom();
      const nextZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), currentZoom + result.zoomDelta));
      if (nextZoom === currentZoom) {
        return;
      }

      map.setZoomAround(map.mouseEventToContainerPoint(event), nextZoom);
    };

    container.addEventListener("wheel", handleWheel, { capture: true, passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel, { capture: true });
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = null;
      stateRef.current = EMPTY_TRACKPAD_PINCH_STATE;
    };
  }, [map]);

  return null;
}
