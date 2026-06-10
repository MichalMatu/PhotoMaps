import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { stopFloatingWindowEvent, useDraggableWindow } from "./useDraggableWindow";

type Props = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  details?: string | null;
  eyebrow?: string;
  isBusy?: boolean;
  message?: string;
  onClose: () => void;
  onConfirm?: () => void;
  showActions?: boolean;
  size?: "default" | "wide";
  title: string;
  tone?: "default" | "danger" | "error";
};

export function SystemModal({
  cancelLabel = "Anuluj",
  children = null,
  confirmDisabled = false,
  confirmLabel = "OK",
  details = null,
  eyebrow = "Komunikat systemowy",
  isBusy = false,
  message = "",
  onClose,
  onConfirm,
  showActions = true,
  size = "default",
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
        className={`system-modal system-modal--${tone} system-modal--${size}${draggableWindow.isDragging ? " is-dragging" : ""}`}
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
        <header className="system-modal-header">
          <div className="system-modal-drag-handle" {...draggableWindow.handleProps}>
            <span className="eyebrow">{eyebrow}</span>
            <h2 id="system-modal-title">{title}</h2>
          </div>
          <button
            className="system-modal-close"
            type="button"
            disabled={isBusy}
            onClick={onClose}
            aria-label="Zamknij modal"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        {message ? <p>{message}</p> : null}
        {children}
        {details ? <pre className="system-modal-details">{details}</pre> : null}
        {showActions ? (
          <div className="system-modal-actions">
            {onConfirm ? (
              <button className="ghost-button" type="button" disabled={isBusy} onClick={onClose}>
                {cancelLabel}
              </button>
            ) : null}
            <button
              className={tone === "danger" || tone === "error" ? "danger-button" : undefined}
              type="button"
              disabled={isBusy || confirmDisabled}
              onClick={onConfirm ?? onClose}
            >
              {isBusy ? "Przetwarzanie..." : confirmLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
