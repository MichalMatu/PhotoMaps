import { useCallback, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { getPlaceMemory, mediaUrl, type PlaceMapItem } from "../../api/client";
import { ErrorModal } from "../ui/ErrorModal";
import { MediaImage } from "../ui/MediaImage";
import { motionClassName, useDeferredClose } from "../ui/motionPresence";
import { useDialogFocus } from "../ui/useDialogFocus";
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
  const { isExiting, requestClose } = useDeferredClose(onClose);
  const titleId = useId();
  const isActiveModal = useCallback(() => document.querySelector(".system-modal") === null, []);
  const { data: memorySource = null } = useQuery({
    enabled: item.kind === "memory",
    queryFn: () => getPlaceMemory(place.id, item.id),
    queryKey: ["place-memory", place.id, item.id],
  });
  const memoryOwnerTools = useMemoryOwnerTools({
    itemKey: `${item.kind}:${item.id}`,
    memory: memorySource,
    onDeleted: requestClose,
    placeId: place.id,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isActiveModal()) {
        requestClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActiveModal, requestClose]);

  useDialogFocus(draggableWindow.windowRef, true, isActiveModal);

  return createPortal(
    <div className={motionClassName(["photo-detail-backdrop"], isExiting)} role="presentation" onClick={requestClose}>
      <article
        className={motionClassName(
          ["photo-detail-modal", draggableWindow.isDragging ? "is-dragging" : null],
          isExiting,
        )}
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
        <header className="photo-detail-header" {...draggableWindow.handleProps}>
          <div className="photo-detail-title-block">
            <div className="photo-detail-title-row">
              <h2 id={titleId}>{place.title}</h2>
              {place.categories[0]?.label ? (
                <span className="photo-detail-category">{place.categories[0].label}</span>
              ) : null}
            </div>
          </div>
          <button
            className="photo-detail-close"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              requestClose();
            }}
            aria-label="Zamknij"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <MediaImage
          alt={item.caption ?? place.title}
          caption={item.caption}
          captionClassName="photo-detail-image-caption"
          className="photo-detail-image-wrap"
          fit="contain"
          imageClassName="photo-detail-image"
          loading="eager"
          ratio="landscape"
          src={mediaUrl(item.public_path)}
        />

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
