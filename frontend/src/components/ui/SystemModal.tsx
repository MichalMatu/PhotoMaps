import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { GripHorizontal, X } from "lucide-react";

import { stopFloatingWindowEvent, useDraggableWindow } from "./useDraggableWindow";
import { useDialogFocus } from "./useDialogFocus";

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
  size?: "default" | "wide" | "large";
  title: string;
  tone?: "default" | "danger" | "error";
  variant?: "default" | "media";
};

let nextModalStackId = 1;
const modalStack: number[] = [];

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
  variant = "default",
}: Props) {
  const draggableWindow = useDraggableWindow<HTMLDivElement>("system-modal");
  const modalStackId = useRef(nextModalStackId++).current;
  const titleId = useId();
  const isTopModal = useCallback(() => modalStack[modalStack.length - 1] === modalStackId, [modalStackId]);

  useEffect(() => {
    modalStack.push(modalStackId);

    return () => {
      const stackIndex = modalStack.indexOf(modalStackId);
      if (stackIndex >= 0) {
        modalStack.splice(stackIndex, 1);
      }
    };
  }, [modalStackId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy && isTopModal()) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBusy, isTopModal, onClose]);

  useDialogFocus(draggableWindow.windowRef, true, isTopModal);

  return createPortal(
    <div className="system-modal-backdrop" role="presentation" onClick={isBusy ? undefined : onClose}>
      <div
        className={`system-modal system-modal--${tone} system-modal--${size} system-modal--${variant}${draggableWindow.isDragging ? " is-dragging" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
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
          <div className="system-modal-title-block">
            <span className="eyebrow">{eyebrow}</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <div className="system-modal-header-actions">
            <div
              className="system-modal-drag-handle"
              aria-label="Przesuń modal"
              title="Przesuń modal"
              {...draggableWindow.handleProps}
            >
              <GripHorizontal aria-hidden="true" size={18} />
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
          </div>
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
