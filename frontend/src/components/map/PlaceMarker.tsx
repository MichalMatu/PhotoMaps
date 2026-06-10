import L from "leaflet";
import { Marker, Popup } from "react-leaflet";

import { mediaUrl, type Category, type Photo, type Place } from "../../api/client";
import { PlacePopup } from "../places/PlacePopup";

function markerIcon(photos: Photo[]) {
  const coverPhoto = photos[0];
  if (!coverPhoto) {
    return L.divIcon({
      className: "place-marker-icon",
      html: "<span></span>",
      iconAnchor: [14, 34],
      iconSize: [28, 34],
      popupAnchor: [0, -30],
    });
  }

  return L.divIcon({
    className: "place-photo-marker",
    html: `<span style="background-image: url('${mediaUrl(coverPhoto.thumb_path)}')"></span>`,
    iconAnchor: [29, 64],
    iconSize: [58, 64],
    popupAnchor: [0, -58],
  });
}

type Props = {
  place: Place;
  photos: Photo[];
  category?: Category;
  onPhotoUploaded?: () => void;
};

export function PlaceMarker({ place, photos, category, onPhotoUploaded }: Props) {
  return (
    <Marker icon={markerIcon(photos)} position={[place.lat, place.lon]}>
      <Popup>
        <PlacePopup place={place} photos={photos} category={category} onPhotoUploaded={onPhotoUploaded} />
      </Popup>
    </Marker>
  );
}
