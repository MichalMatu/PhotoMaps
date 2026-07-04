import type { AdminPhoto, City, Place } from "../../api/types";
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
  return (
    <SystemModal eyebrow="" showActions={false} size="large" title="Zdjęcia miejsca" onClose={onClose}>
      {isLoading ? (
        <p className="ui-help" role="status">
          Ładowanie zdjęć miejsca...
        </p>
      ) : null}
      {!isLoading ? <PlacePhotoPanel cities={cities} photos={photos} place={place} onChanged={onChanged} /> : null}
    </SystemModal>
  );
}
