import { useEffect } from "react";
import { createPortal } from "react-dom";

import { mediaUrl, type Photo, type PlaceMapItem } from "../../api/client";

type Props = {
  onClose: () => void;
  onOpenDetails: () => void;
  photo: Photo;
  place: PlaceMapItem;
};

export function MapPhotoViewer({ onClose, onOpenDetails, photo, place }: Props) {
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
    <div
      className="map-photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Zdjęcie: ${place.title}`}
      onClick={onClose}
    >
      <div className="map-photo-viewer-image-wrap" onClick={(event) => event.stopPropagation()}>
        <button className="map-photo-viewer-image-button" type="button" onClick={onOpenDetails}>
          <img src={mediaUrl(photo.public_path)} alt={photo.caption ?? place.title} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
