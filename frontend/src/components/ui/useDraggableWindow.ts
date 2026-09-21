import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type WindowPosition = {
  left: number;
  top: number;
};

type DragState = {
  pointerId: number;
  startLeft: number;
  startTop: number;
  startX: number;
  startY: number;
  started: boolean;
};

const VIEWPORT_MARGIN = 8;
const DRAG_START_DISTANCE = 6;
const COMPACT_MEDIA_QUERY = "(max-width: 640px), (max-height: 520px)";

function shouldUseDefaultPosition() {
  return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
}

function clampWindowPosition(element: HTMLElement, left: number, top: number): WindowPosition {
  const rect = element.getBoundingClientRect();
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN);
  const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN);

  return {
    left: Math.min(Math.max(VIEWPORT_MARGIN, left), maxLeft),
    top: Math.min(Math.max(VIEWPORT_MARGIN, top), maxTop),
  };
}

export function isInteractiveDragTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, input, select, textarea, a, [data-drag-ignore]"));
}

export function stopFloatingWindowEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function useDraggableWindow<TElement extends HTMLElement>(isActive = true) {
  const windowRef = useRef<TElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<WindowPosition | null>(null);

  useEffect(() => {
    setPosition(null);
  }, [isActive]);

  useEffect(() => {
    const handleResize = () => {
      const element = windowRef.current;
      if (!element || shouldUseDefaultPosition()) {
        setPosition(null);
        return;
      }

      setPosition((currentPosition) =>
        currentPosition ? clampWindowPosition(element, currentPosition.left, currentPosition.top) : currentPosition,
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const element = windowRef.current;
      if (!dragState || !element || event.pointerId !== dragState.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (!dragState.started) {
        if (Math.hypot(deltaX, deltaY) < DRAG_START_DISTANCE) {
          return;
        }

        dragState.started = true;
        setPosition(clampWindowPosition(element, dragState.startLeft, dragState.startTop));
        setIsDragging(true);
      }

      event.preventDefault();
      setPosition(
        clampWindowPosition(
          element,
          dragState.startLeft + deltaX,
          dragState.startTop + deltaY,
        ),
      );
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const element = windowRef.current;
      if (!dragState || !element || event.pointerId !== dragState.pointerId) {
        return;
      }

      if (!dragState.started) {
        dragStateRef.current = null;
        setIsDragging(false);
        return;
      }

      const nextPosition = clampWindowPosition(
        element,
        element.getBoundingClientRect().left,
        element.getBoundingClientRect().top,
      );
      setPosition(nextPosition);
      dragStateRef.current = null;
      setIsDragging(false);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerEnd);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerEnd);
      document.removeEventListener("pointercancel", handlePointerEnd);
    };
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || shouldUseDefaultPosition() || isInteractiveDragTarget(event.target)) {
      return;
    }

    const element = windowRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      startLeft: rect.left,
      startTop: rect.top,
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    };
  }, []);

  const style: CSSProperties | undefined = position
    ? {
        bottom: "auto",
        left: `${position.left}px`,
        margin: 0,
        position: "fixed",
        right: "auto",
        top: `${position.top}px`,
      }
    : undefined;

  return {
    handleProps: {
      onPointerDown: handlePointerDown,
    },
    isDragging,
    style,
    windowRef,
  };
}
