import type { CSSProperties } from "react";

import type { AdminPhoto, City, Place } from "../../api/types";
import { placePhotoModalWidthPx } from "./placePhotoPanelLayout";
import { PlacePhotoPanel } from "./PlacePhotoPanel";
import { SystemModal } from "./SystemModal";

type Props = {
  isLoading: boolean;
  cities: City[];
  onChanged: () => Promise<void>;
  onClose: () => void;
  photos: AdminPhoto[];
  place: Place;
};

export function AdminPlacePhotoPreviewModal({ cities, isLoading, onChanged, onClose, photos, place }: Props) {
  const modalStyle = {
    "--system-modal-width": `${placePhotoModalWidthPx(photos.length)}px`,
  } as CSSProperties;

  return (
    <SystemModal
      eyebrow=""
      showActions={false}
      size="large"
      style={modalStyle}
      title="Zdjęcia miejsca"
      onClose={onClose}
    >
      {isLoading ? (
        <p className="ui-help" role="status">
          Ładowanie zdjęć miejsca...
        </p>
      ) : null}
      {!isLoading ? <PlacePhotoPanel cities={cities} photos={photos} place={place} onChanged={onChanged} /> : null}
    </SystemModal>
  );
}
