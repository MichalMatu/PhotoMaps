import { useCallback, useEffect, useRef, useState } from "react";

export const MOTION_EXIT_DURATION_MS = 180;
export const MOTION_REDUCED_EXIT_DURATION_MS = 1;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type MotionClassName = string | null | undefined | false;

export function getMotionExitDurationMs() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return MOTION_EXIT_DURATION_MS;
  }

  return window.matchMedia(REDUCED_MOTION_QUERY).matches ? MOTION_REDUCED_EXIT_DURATION_MS : MOTION_EXIT_DURATION_MS;
}

export function motionClassName(classNames: MotionClassName[], isExiting: boolean) {
  return [...classNames.filter(Boolean), isExiting ? "is-exiting" : null].filter(Boolean).join(" ");
}

export function useDeferredClose(onClose: () => void) {
  const timeoutRef = useRef<number | null>(null);
  const isExitingRef = useRef(false);
  const [isExiting, setIsExiting] = useState(false);

  const clearCloseTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const finishClose = useCallback(() => {
    clearCloseTimer();
    isExitingRef.current = false;
    setIsExiting(false);
    onClose();
  }, [clearCloseTimer, onClose]);

  const requestClose = useCallback(() => {
    if (isExitingRef.current) {
      return;
    }

    isExitingRef.current = true;
    setIsExiting(true);

    if (typeof window === "undefined") {
      finishClose();
      return;
    }

    timeoutRef.current = window.setTimeout(finishClose, getMotionExitDurationMs());
  }, [finishClose]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  return {
    isExiting,
    requestClose,
  };
}
