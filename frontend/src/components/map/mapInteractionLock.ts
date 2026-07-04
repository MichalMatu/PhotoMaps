import { useEffect } from "react";
import { useMap } from "react-leaflet";

import { lockMapInteractions } from "./mapInteractionLockState";

type Props = {
  isLocked: boolean;
};

export function MapInteractionLock({ isLocked }: Props) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle("is-photo-gallery-open", isLocked);

    if (!isLocked) {
      return undefined;
    }

    return lockMapInteractions(map);
  }, [isLocked, map]);

  useEffect(() => {
    const container = map.getContainer();

    return () => {
      container.classList.remove("is-photo-gallery-open");
    };
  }, [map]);

  return null;
}
