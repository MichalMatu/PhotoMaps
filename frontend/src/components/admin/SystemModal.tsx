import { useEffect } from "react";
import { createPortal } from "react-dom";

import { stopFloatingWindowEvent, useDraggableWindow } from "../ui/useDraggableWindow";

type Props = {
  cancelLabel?: string;
  confirmLabel?: string;
  eyebrow?: string;
  isBusy?: boolean;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  tone?: "default" | "danger" | "error";
};

export function SystemModal({
  cancelLabel = "Anuluj",
  confirmLabel = "OK",
  eyebrow = "Komunikat systemowy",
  isBusy = false,
  message,
  onClose,
  onConfirm,
  title,
  tone = "default",
}: Props) {
  const draggableWindow = useDraggableWindow<HTMLDivElement>("system-modal");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBusy, onClose]);

  return createPortal(
    <div className="system-modal-backdrop" role="presentation">
      <div
        className={`system-modal system-modal--${tone}${draggableWindow.isDragging ? " is-dragging" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-modal-title"
        ref={draggableWindow.windowRef}
        style={draggableWindow.style}
        onClick={stopFloatingWindowEvent}
        onContextMenu={stopFloatingWindowEvent}
        onDoubleClick={stopFloatingWindowEvent}
        onMouseDown={stopFloatingWindowEvent}
        onPointerDown={stopFloatingWindowEvent}
        onTouchStart={stopFloatingWindowEvent}
        onWheel={stopFloatingWindowEvent}
      >
        <div className="system-modal-drag-handle" {...draggableWindow.handleProps}>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id="system-modal-title">{title}</h2>
        </div>
        <p>{message}</p>
        <div className="system-modal-actions">
          {onConfirm ? (
            <button className="ghost-button" type="button" disabled={isBusy} onClick={onClose}>
              {cancelLabel}
            </button>
          ) : null}
          <button
            className={tone === "danger" || tone === "error" ? "danger-button" : undefined}
            type="button"
            disabled={isBusy}
            onClick={onConfirm ?? onClose}
          >
            {isBusy ? "Przetwarzanie..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
