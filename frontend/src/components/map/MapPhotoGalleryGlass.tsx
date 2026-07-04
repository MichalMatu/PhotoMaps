import type { CSSProperties } from "react";
import { useMap } from "react-leaflet";

import type { PlaceMapItem } from "../../api/types";

type PhotoGalleryGlassStyle = CSSProperties & {
  "--photo-gallery-glass-origin-x": string;
  "--photo-gallery-glass-origin-y": string;
};

type Props = {
  onClose: () => void;
  place: Pick<PlaceMapItem, "lat" | "lon"> | null;
};

export function MapPhotoGalleryGlass({ onClose, place }: Props) {
  const map = useMap();

  if (!place) {
    return null;
  }

  const origin = map.latLngToContainerPoint([place.lat, place.lon]);
  const style: PhotoGalleryGlassStyle = {
    "--photo-gallery-glass-origin-x": `${origin.x}px`,
    "--photo-gallery-glass-origin-y": `${origin.y}px`,
  };

  return (
    <div
      aria-hidden
      className="photo-gallery-glass-overlay"
      style={style}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    />
  );
}
