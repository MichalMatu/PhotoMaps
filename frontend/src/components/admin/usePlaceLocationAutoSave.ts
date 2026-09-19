import { useCallback, useRef, useState } from "react";

import { hasPlaceLocationChanged, type PlaceLocation, type PlaceLocationAutoSaveStatus } from "./placeLocationAutoSave";

type UsePlaceLocationAutoSaveOptions = {
  onSave?: (location: PlaceLocation) => Promise<void>;
};

export function usePlaceLocationAutoSave({ onSave }: UsePlaceLocationAutoSaveOptions) {
  const savedLocationRef = useRef<PlaceLocation | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [status, setStatus] = useState<PlaceLocationAutoSaveStatus>("idle");

  const reset = useCallback((location: PlaceLocation) => {
    savedLocationRef.current = location;
    setStatus("idle");
  }, []);

  const save = useCallback(
    (nextLocation: PlaceLocation) => {
      if (!onSave || !savedLocationRef.current) {
        return;
      }

      if (!hasPlaceLocationChanged(savedLocationRef.current, nextLocation)) {
        setStatus("idle");
        return;
      }

      const requestedLocation = { ...nextLocation };
      setStatus("saving");
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          if (!savedLocationRef.current || !hasPlaceLocationChanged(savedLocationRef.current, requestedLocation)) {
            return;
          }

          setStatus("saving");
          await onSave(requestedLocation);
          savedLocationRef.current = requestedLocation;
          setStatus("saved");
        })
        .catch(() => {
          setStatus("error");
        });
    },
    [onSave],
  );

  return {
    resetLocationAutoSave: reset,
    saveLocation: save,
    locationAutoSaveStatus: status,
  };
}
