import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { mediaUrl, type Photo, type PlaceMapItem } from "../../api/client";
import { stopFloatingWindowEvent, useDraggableWindow } from "../ui/useDraggableWindow";

type Props = {
  onClose: () => void;
  onReport: () => void;
  photo: Photo;
  place: PlaceMapItem;
};

export function PhotoDetailModal({ onClose, onReport, photo, place }: Props) {
  const draggableWindow = useDraggableWindow<HTMLDivElement>("photo-detail-modal");

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
          <div>
            <span>{place.category?.label ?? "Miejsce"}</span>
            <h2 id="photo-detail-title">{place.title}</h2>
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

        <img className="photo-detail-image" src={mediaUrl(photo.public_path)} alt={photo.caption ?? place.title} />

        <div className="photo-detail-body">
          {photo.caption ? <p>{photo.caption}</p> : null}
          {place.description ? <p>{place.description}</p> : null}
          {place.local_comment ? <p className="photo-detail-local-comment">{place.local_comment}</p> : null}
          <button className="photo-detail-report-link" type="button" onClick={onReport}>
            Zgłoś problem
          </button>
        </div>
      </article>
    </div>,
    document.body,
  );
}
