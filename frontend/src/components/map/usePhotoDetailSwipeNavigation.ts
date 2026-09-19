import { useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { PhotoDetailNavigationDirection } from "./photoDetailNavigation";
import { photoDetailSwipeDirection, type PhotoDetailSwipeStart } from "./photoDetailSwipe";

type Params = {
  canNavigate: boolean;
  navigate: (direction: PhotoDetailNavigationDirection) => void;
};

type PhotoDetailSwipeState = PhotoDetailSwipeStart & {
  pointerId: number;
};

function isPhotoDetailSwipeTargetBlocked(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return true;
  }

  return Boolean(
    target.closest(
      [
        "a",
        "audio",
        "button",
        "input",
        "select",
        "textarea",
        "[role='button']",
        ".photo-detail-description",
        ".photo-detail-overlay",
      ].join(","),
    ),
  );
}

function setSwipeCapture(element: HTMLDivElement, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    return;
  }
}

function clearSwipeCapture(element: HTMLDivElement, pointerId: number) {
  if (element.hasPointerCapture(pointerId)) {
    element.releasePointerCapture(pointerId);
  }
}

export function usePhotoDetailSwipeNavigation({ canNavigate, navigate }: Params) {
  const swipeStateRef = useRef<PhotoDetailSwipeState | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    swipeStateRef.current = null;

    if (
      !canNavigate ||
      (event.pointerType !== "touch" && event.pointerType !== "pen") ||
      isPhotoDetailSwipeTargetBlocked(event.target)
    ) {
      return;
    }

    swipeStateRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      viewportWidth: event.currentTarget.clientWidth,
    };
    setSwipeCapture(event.currentTarget, event.pointerId);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const swipeState = swipeStateRef.current;
    if (!swipeState || swipeState.pointerId !== event.pointerId) {
      return;
    }

    swipeStateRef.current = null;
    clearSwipeCapture(event.currentTarget, event.pointerId);

    const direction = photoDetailSwipeDirection(swipeState, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
    if (!direction) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    navigate(direction);
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const swipeState = swipeStateRef.current;
    if (!swipeState || swipeState.pointerId !== event.pointerId) {
      return;
    }

    swipeStateRef.current = null;
    clearSwipeCapture(event.currentTarget, event.pointerId);
  };

  return {
    onPointerCancel: handlePointerCancel,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
  };
}
