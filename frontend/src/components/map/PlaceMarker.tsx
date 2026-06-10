import L from "leaflet";
import { Marker, Popup } from "react-leaflet";

import type { Category, Photo, Place } from "../../api/client";
import { PlacePopup } from "../places/PlacePopup";

const placeMarkerIcon = L.divIcon({
  className: "place-marker-icon",
  html: "<span></span>",
  iconAnchor: [14, 34],
  iconSize: [28, 34],
  popupAnchor: [0, -30],
});

type Props = {
  place: Place;
  photos: Photo[];
  category?: Category;
  onPhotoUploaded?: () => void;
};

export function PlaceMarker({ place, photos, category, onPhotoUploaded }: Props) {
  return (
    <Marker icon={placeMarkerIcon} position={[place.lat, place.lon]}>
      <Popup>
        <PlacePopup place={place} photos={photos} category={category} onPhotoUploaded={onPhotoUploaded} />
      </Popup>
    </Marker>
  );
}
