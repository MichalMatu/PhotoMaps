import { useEffect } from "react";
import { createPortal } from "react-dom";

import { mediaUrl, type PlaceMapItem } from "../../api/client";
import { MediaImage } from "../ui/MediaImage";
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
          <MediaImage
            alt={item.caption ?? place.title}
            caption={
              <>
                <strong>{place.title}</strong>
                {item.caption ? <span>{item.caption}</span> : null}
              </>
            }
            captionClassName="map-photo-viewer-caption"
            className="map-photo-viewer-media"
            fit="contain"
            loading="eager"
            ratio="viewer"
            src={mediaUrl(item.public_path)}
          />
        </button>
      </div>
    </div>,
    document.body,
  );
}
