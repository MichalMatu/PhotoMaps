import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { mediaUrl, type PlaceMapItem } from "../../api/client";
import { ErrorModal } from "../ui/ErrorModal";
import { stopFloatingWindowEvent, useDraggableWindow } from "../ui/useDraggableWindow";
import { MemoryOwnerTools } from "./MemoryOwnerTools";
import type { PlaceMapVisualItem } from "./placePreview";
import { useMemoryOwnerTools } from "./useMemoryOwnerTools";

type Props = {
  item: PlaceMapVisualItem;
  onClose: () => void;
  onReport: () => void;
  place: PlaceMapItem;
};

export function PhotoDetailModal({ item, onClose, onReport, place }: Props) {
  const draggableWindow = useDraggableWindow<HTMLDivElement>("photo-detail-modal");
  const memorySource = item.kind === "memory" ? item.source : null;
  const memoryOwnerTools = useMemoryOwnerTools({
    itemKey: `${item.kind}:${item.id}`,
    memory: memorySource,
    onDeleted: onClose,
    placeId: place.id,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="photo-detail-backdrop" role="presentation" onClick={onClose}>
      <article
        className={draggableWindow.isDragging ? "photo-detail-modal is-dragging" : "photo-detail-modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-detail-title"
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
        <header className="photo-detail-header" {...draggableWindow.handleProps}>
          <div className="photo-detail-title-block">
            <div className="photo-detail-title-row">
              <h2 id="photo-detail-title">{place.title}</h2>
              {place.category?.label ? <span className="photo-detail-category">{place.category.label}</span> : null}
            </div>
          </div>
          <button
            className="photo-detail-close"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            aria-label="Zamknij"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="photo-detail-image-wrap">
          <img className="photo-detail-image" src={mediaUrl(item.public_path)} alt={item.caption ?? place.title} />
          {item.caption ? <span className="photo-detail-image-caption">{item.caption}</span> : null}
        </div>

        <div className="photo-detail-body">
          {memorySource ? <p className="photo-detail-memory-text">{memorySource.memory_text}</p> : null}
          {memorySource ? <MemoryOwnerTools tools={memoryOwnerTools} /> : null}
          <div className="photo-detail-footer">
            <button className="photo-detail-report-link" type="button" onClick={onReport}>
              Zgłoś problem
            </button>
          </div>
        </div>
        {memoryOwnerTools.operationError ? (
          <ErrorModal {...memoryOwnerTools.operationError} onClose={() => memoryOwnerTools.setOperationError(null)} />
        ) : null}
      </article>
    </div>,
    document.body,
  );
}
