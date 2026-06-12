import { type ReactNode, type SyntheticEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { motionClassName, useDeferredClose } from "./motionPresence";
import { stopFloatingWindowEvent, useDraggableWindow } from "./useDraggableWindow";

type Props = {
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  open: boolean;
  storageId?: string;
  subtitle?: ReactNode;
  title: string;
  onClose: () => void;
};

export function ResponsiveSheet({
  children,
  className,
  footer,
  open,
  storageId = "responsive-sheet",
  subtitle,
  title,
  onClose,
}: Props) {
  const draggableWindow = useDraggableWindow<HTMLElement>(storageId, open);
  const { isExiting, requestClose } = useDeferredClose(onClose);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, requestClose]);

  if (!open) {
    return null;
  }

  const stopEvent = (event: SyntheticEvent) => stopFloatingWindowEvent(event);

  return createPortal(
    <aside
      className={motionClassName(["pm-sheet", className, draggableWindow.isDragging ? "is-dragging" : null], isExiting)}
      aria-label={title}
      ref={draggableWindow.windowRef}
      style={draggableWindow.style}
      onClick={stopEvent}
      onContextMenu={stopEvent}
      onDoubleClick={stopEvent}
      onMouseDown={stopEvent}
      onPointerDown={stopEvent}
      onTouchStart={stopEvent}
      onWheel={stopEvent}
    >
      <div className="pm-sheet__handle" aria-hidden="true" />
      <header className="pm-sheet__header" {...draggableWindow.handleProps}>
        <div>
          {subtitle ? <div className="pm-sheet__subtitle">{subtitle}</div> : null}
          <h2>{title}</h2>
        </div>
        <button className="pm-sheet__close" type="button" onClick={requestClose} aria-label="Zamknij panel">
          <X aria-hidden="true" size={18} />
        </button>
      </header>
      <div className="pm-sheet__body">{children}</div>
      {footer ? <footer className="pm-sheet__footer">{footer}</footer> : null}
    </aside>,
    document.body,
  );
}
