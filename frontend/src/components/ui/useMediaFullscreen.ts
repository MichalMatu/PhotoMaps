import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export function useMediaFullscreen(contentRef: RefObject<HTMLDivElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenTargetRef = useRef<HTMLElement | null>(null);

  const getFullscreenTarget = useCallback(() => {
    const target = contentRef.current?.closest<HTMLElement>(".system-modal") ?? fullscreenTargetRef.current;
    fullscreenTargetRef.current = target;
    return target;
  }, [contentRef]);

  const syncFullscreenState = useCallback(() => {
    const target = getFullscreenTarget();
    setIsFullscreen(Boolean(target && document.fullscreenElement === target));
  }, [getFullscreenTarget]);

  useEffect(() => {
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      const target = fullscreenTargetRef.current;
      if (target && document.fullscreenElement === target) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [syncFullscreenState]);

  const toggleFullscreen = useCallback(() => {
    const target = getFullscreenTarget();
    if (!target || !document.fullscreenEnabled) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }

    void target.requestFullscreen().catch(() => undefined);
  }, [getFullscreenTarget]);

  return { isFullscreen, toggleFullscreen };
}
