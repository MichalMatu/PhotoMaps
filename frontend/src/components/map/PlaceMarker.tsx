import { Marker, Popup } from "react-leaflet";

import type { Category, Place } from "../../api/client";
import { PlacePopup } from "../places/PlacePopup";

type Props = {
  place: Place;
  category?: Category;
  onPhotoUploaded?: () => void;
};

export function PlaceMarker({ place, category, onPhotoUploaded }: Props) {
  return (
    <Marker position={[place.lat, place.lon]}>
      <Popup>
        <PlacePopup place={place} category={category} onPhotoUploaded={onPhotoUploaded} />
      </Popup>
    </Marker>
  );
}
