import { useEffect } from "react";
import { createPortal } from "react-dom";

import { mediaUrl, type PlaceMapItem } from "../../api/client";
import { motionClassName, useDeferredClose } from "../ui/motionPresence";
import type { PlaceMapVisualItem } from "./placePreview";

type Props = {
  item: PlaceMapVisualItem;
  onClose: () => void;
  onOpenDetails: () => void;
  place: PlaceMapItem;
};

export function MapPhotoViewer({ item, onClose, onOpenDetails, place }: Props) {
  const { isExiting, requestClose } = useDeferredClose(onClose);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [requestClose]);

  return createPortal(
    <div
      className={motionClassName(["map-photo-viewer"], isExiting)}
      role="dialog"
      aria-modal="true"
      aria-label={`Zdjęcie: ${place.title}`}
      onClick={requestClose}
    >
      <div className="map-photo-viewer-image-wrap" onClick={(event) => event.stopPropagation()}>
        <button
          className="map-photo-viewer-image-button"
          type="button"
          onClick={onOpenDetails}
          aria-label={`Otwórz szczegóły zdjęcia: ${place.title}`}
        >
          <img src={mediaUrl(item.public_path)} alt={item.caption ?? place.title} />
          <span className="map-photo-viewer-caption">
            <strong>{place.title}</strong>
            {item.caption ? <span>{item.caption}</span> : null}
          </span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
