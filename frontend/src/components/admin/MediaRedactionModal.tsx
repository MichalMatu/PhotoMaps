import { useState } from "react";
import { RotateCcw, RotateCw, Trash2, Undo2 } from "lucide-react";

import type { AdminMemory, AdminPhoto } from "../../api/types";
import { AdminMediaImage } from "./AdminAuthenticatedMedia";
import { SystemModal } from "./SystemModal";
import type { RedactionPolygon } from "./mediaRedactionGeometry";
import { useMediaRedactionEditor } from "./useMediaRedactionEditor";

type Props = {
  isApplying?: boolean;
  kind: "memory" | "photo";
  media: AdminMemory | AdminPhoto;
  onApply: (redactions: RedactionPolygon[]) => Promise<void>;
  onClose: () => void;
};

export function MediaRedactionModal({ isApplying = false, kind, media, onApply, onClose }: Props) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    activeRedaction,
    activeRedactionIndex,
    cursorClassName,
    draftRedaction,
    handleClear,
    handlePointerCancel,
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp,
    handleRotate,
    handleUndo,
    redactions,
    stageRef,
  } = useMediaRedactionEditor({
    disabled: isApplying,
    onInteractionStart: () => setSaveError(null),
  });

  const title = kind === "photo" ? "Anonimizuj zdjęcie" : "Anonimizuj pamiątkę";
  const canApply = redactions.length > 0 && !isApplying;
  const imagePath = kind === "memory" ? (media as AdminMemory).admin_public_path : (media as AdminPhoto).public_path;

  async function handleApply() {
    setSaveError(null);
    try {
      await onApply(redactions);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Nie udało się zapisać redakcji obrazu.");
    }
  }

  return (
    <SystemModal
      confirmDisabled={!canApply}
      confirmLabel="Zastosuj"
      eyebrow="Media"
      isBusy={isApplying}
      showActions={false}
      size="large"
      title={title}
      onClose={onClose}
    >
      <div className="media-redaction-modal">
        <div
          className={cursorClassName}
          ref={stageRef}
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerLeave={handlePointerLeave}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <AdminMediaImage className="media-redaction-image" alt={media.caption ?? title} src={imagePath} />
          <svg className="media-redaction-overlay" aria-hidden="true" viewBox="0 0 1 1" preserveAspectRatio="none">
            {[...redactions, ...(draftRedaction ? [draftRedaction] : [])].map((redaction, index) => {
              const isDraft = index >= redactions.length;
              const isActive = index === activeRedactionIndex;
              return (
                <g className={isDraft ? "is-draft" : isActive ? "is-active" : undefined} key={`${index}-${isDraft}`}>
                  <polygon points={redaction.points.map((point) => `${point.x},${point.y}`).join(" ")} />
                  {isActive && !isDraft
                    ? redaction.points.map((point, pointIndex) => (
                        <rect
                          className="media-redaction-handle"
                          height="0.026"
                          key={pointIndex}
                          width="0.026"
                          x={point.x - 0.013}
                          y={point.y - 0.013}
                        />
                      ))
                    : null}
                </g>
              );
            })}
          </svg>
        </div>
        <footer className="media-redaction-footer">
          <div className="review-tool-actions">
            <button
              className="ui-button ui-button--ghost media-redaction-icon-button"
              type="button"
              disabled={!redactions.length || isApplying}
              title="Cofnij obszar"
              aria-label="Cofnij obszar"
              onClick={handleUndo}
            >
              <Undo2 aria-hidden="true" size={18} />
            </button>
            <button
              className="ui-button ui-button--ghost media-redaction-icon-button"
              type="button"
              disabled={!activeRedaction || isApplying}
              title="Obróć w lewo"
              aria-label="Obróć w lewo"
              onClick={() => handleRotate(-5)}
            >
              <RotateCcw aria-hidden="true" size={18} />
            </button>
            <button
              className="ui-button ui-button--ghost media-redaction-icon-button"
              type="button"
              disabled={!activeRedaction || isApplying}
              title="Obróć w prawo"
              aria-label="Obróć w prawo"
              onClick={() => handleRotate(5)}
            >
              <RotateCw aria-hidden="true" size={18} />
            </button>
            <button
              className="ui-button ui-button--ghost media-redaction-icon-button"
              type="button"
              disabled={!redactions.length || isApplying}
              title="Wyczyść"
              aria-label="Wyczyść"
              onClick={handleClear}
            >
              <Trash2 aria-hidden="true" size={18} />
            </button>
          </div>
          <span className="media-redaction-count">
            {redactions.length === 1 ? "1 obszar" : `${redactions.length} obszarów`}
          </span>
          <button type="button" disabled={!canApply} onClick={handleApply}>
            {isApplying ? "Zapisywanie..." : "Zastosuj"}
          </button>
        </footer>
        {saveError ? <p className="ui-error">{saveError}</p> : null}
      </div>
    </SystemModal>
  );
}
