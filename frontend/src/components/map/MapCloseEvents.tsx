import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import { isMapCloseDragGesture, type MapClosePointer } from "./mapCloseGesture";

type Props = {
  onClose: () => void;
};

export function MapCloseEvents({ onClose }: Props) {
  const map = useMap();
  const pointerStartRef = useRef<MapClosePointer | null>(null);
  const ignoreNextClickRef = useRef(false);
  const resetIgnoreTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const container = map.getContainer();

    const clearResetTimeout = () => {
      if (resetIgnoreTimeoutRef.current !== null) {
        window.clearTimeout(resetIgnoreTimeoutRef.current);
        resetIgnoreTimeoutRef.current = null;
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      clearResetTimeout();
      pointerStartRef.current = { clientX: event.clientX, clientY: event.clientY };
      ignoreNextClickRef.current = false;
    };
    const handlePointerMove = (event: PointerEvent) => {
      const pointerStart = pointerStartRef.current;
      if (pointerStart && isMapCloseDragGesture(pointerStart, event)) {
        ignoreNextClickRef.current = true;
      }
    };
    const handlePointerEnd = () => {
      pointerStartRef.current = null;
      if (ignoreNextClickRef.current) {
        resetIgnoreTimeoutRef.current = window.setTimeout(() => {
          ignoreNextClickRef.current = false;
          resetIgnoreTimeoutRef.current = null;
        }, 250);
      }
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerEnd);
    container.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      clearResetTimeout();
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerEnd);
      container.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, [map]);

  useMapEvents({
    click: () => {
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false;
        return;
      }

      onClose();
    },
  });

  return null;
}
