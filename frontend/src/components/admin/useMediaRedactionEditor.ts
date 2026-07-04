import { type PointerEvent, useCallback, useMemo, useRef, useState } from "react";

import {
  moveRedaction,
  rectToRedaction,
  redactionAtPoint,
  redactionHandleAtPoint,
  resizeRedactionPoint,
  rotateRedaction,
  type RedactionHandle,
  type RedactionPoint,
  type RedactionPolygon,
} from "./mediaRedactionGeometry";

type DragState = {
  activeHandle?: RedactionHandle;
  lastPoint: RedactionPoint;
  mode: "draw" | "move" | "resize";
  pointerId: number;
  redactionIndex?: number;
  start: RedactionPoint;
};

type CursorState = "draw" | "handle" | "move" | "redaction" | "resize";

type Options = {
  disabled?: boolean;
  onInteractionStart?: () => void;
};

export function useMediaRedactionEditor({ disabled = false, onInteractionStart }: Options = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [activeRedactionIndex, setActiveRedactionIndex] = useState(-1);
  const [cursorState, setCursorState] = useState<CursorState>("draw");
  const [draftRedaction, setDraftRedaction] = useState<RedactionPolygon | null>(null);
  const [redactions, setRedactions] = useState<RedactionPolygon[]>([]);

  const activeRedaction = activeRedactionIndex >= 0 ? redactions[activeRedactionIndex] : null;
  const cursorClassName = useMemo(() => `media-redaction-stage is-${cursorState}`, [cursorState]);

  const pointerFromEvent = useCallback((event: PointerEvent<HTMLElement>): RedactionPoint | null => {
    const stage = stageRef.current;
    if (!stage) {
      return null;
    }

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      x: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1),
      y: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1),
    };
  }, []);

  const updateHoverState = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const stage = stageRef.current;
      const point = pointerFromEvent(event);
      if (!stage || !point) {
        setCursorState("draw");
        return;
      }

      const metrics = {
        displayHeight: stage.getBoundingClientRect().height,
        displayWidth: stage.getBoundingClientRect().width,
      };
      const handle = redactionHandleAtPoint(point, redactions, activeRedactionIndex, metrics);
      if (handle) {
        setCursorState("handle");
        return;
      }

      setCursorState(redactionAtPoint(point, redactions) >= 0 ? "redaction" : "draw");
    },
    [activeRedactionIndex, pointerFromEvent, redactions],
  );

  function capturePointer(pointerId: number) {
    try {
      stageRef.current?.setPointerCapture(pointerId);
    } catch {
      // The browser can cancel the pointer before capture is established.
    }
  }

  function releasePointer(pointerId: number) {
    try {
      stageRef.current?.releasePointerCapture(pointerId);
    } catch {
      // Pointer capture can already be gone after cancellation.
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }

    const stage = stageRef.current;
    const start = pointerFromEvent(event);
    if (!stage || !start) {
      return;
    }

    event.preventDefault();
    onInteractionStart?.();
    const metrics = {
      displayHeight: stage.getBoundingClientRect().height,
      displayWidth: stage.getBoundingClientRect().width,
    };
    const activeHandle = redactionHandleAtPoint(start, redactions, activeRedactionIndex, metrics);
    if (activeHandle) {
      setActiveRedactionIndex(activeHandle.redactionIndex);
      dragStateRef.current = {
        activeHandle,
        lastPoint: start,
        mode: "resize",
        pointerId: event.pointerId,
        start,
      };
      setCursorState("resize");
      capturePointer(event.pointerId);
      return;
    }

    const hitIndex = redactionAtPoint(start, redactions);
    if (hitIndex >= 0) {
      setActiveRedactionIndex(hitIndex);
      dragStateRef.current = {
        lastPoint: start,
        mode: "move",
        pointerId: event.pointerId,
        redactionIndex: hitIndex,
        start,
      };
      setCursorState("move");
      capturePointer(event.pointerId);
      return;
    }

    setActiveRedactionIndex(-1);
    dragStateRef.current = {
      lastPoint: start,
      mode: "draw",
      pointerId: event.pointerId,
      start,
    };
    setCursorState("draw");
    capturePointer(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState) {
      updateHoverState(event);
      return;
    }
    if (event.pointerId !== dragState.pointerId) {
      return;
    }

    const current = pointerFromEvent(event);
    if (!current) {
      return;
    }

    event.preventDefault();

    if (dragState.mode === "draw") {
      setDraftRedaction(rectToRedaction(dragState.start, current));
      dragState.lastPoint = current;
      return;
    }

    if (dragState.mode === "move") {
      const dx = current.x - dragState.lastPoint.x;
      const dy = current.y - dragState.lastPoint.y;
      const movingIndex = dragState.redactionIndex ?? activeRedactionIndex;
      if (movingIndex >= 0) {
        setRedactions((items) =>
          items.map((redaction, index) => (index === movingIndex ? moveRedaction(redaction, dx, dy) : redaction)),
        );
      }
      dragState.lastPoint = current;
      return;
    }

    if (dragState.mode === "resize" && dragState.activeHandle) {
      const { pointIndex, redactionIndex } = dragState.activeHandle;
      setRedactions((items) =>
        items.map((redaction, index) =>
          index === redactionIndex ? resizeRedactionPoint(redaction, pointIndex, current) : redaction,
        ),
      );
      dragState.lastPoint = current;
    }
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    event.preventDefault();
    const end = pointerFromEvent(event);
    if (dragState.mode === "draw" && end) {
      const nextRedaction = rectToRedaction(dragState.start, end);
      if (nextRedaction) {
        setRedactions([...redactions, nextRedaction]);
        setActiveRedactionIndex(redactions.length);
      }
    }

    releasePointer(event.pointerId);
    dragStateRef.current = null;
    setDraftRedaction(null);
    if (end) {
      updateHoverState(event);
    } else {
      setCursorState("draw");
    }
  }

  function handlePointerLeave() {
    if (!dragStateRef.current) {
      setCursorState("draw");
    }
  }

  function handleUndo() {
    onInteractionStart?.();
    const nextRedactions = redactions.slice(0, -1);
    setRedactions(nextRedactions);
    setActiveRedactionIndex(nextRedactions.length ? nextRedactions.length - 1 : -1);
  }

  function handleClear() {
    onInteractionStart?.();
    setRedactions([]);
    setActiveRedactionIndex(-1);
  }

  function handleRotate(degrees: number) {
    onInteractionStart?.();
    const selectedIndex = activeRedactionIndex >= 0 ? activeRedactionIndex : redactions.length - 1;
    if (selectedIndex < 0) {
      return;
    }
    setActiveRedactionIndex(selectedIndex);
    setRedactions((items) =>
      items.map((redaction, index) => (index === selectedIndex ? rotateRedaction(redaction, degrees) : redaction)),
    );
  }

  return {
    activeRedaction,
    activeRedactionIndex,
    cursorClassName,
    draftRedaction,
    handleClear,
    handlePointerCancel: finishPointer,
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp: finishPointer,
    handleRotate,
    handleUndo,
    redactions,
    stageRef,
  };
}
