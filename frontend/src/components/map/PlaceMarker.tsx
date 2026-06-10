import { Marker, Popup } from "react-leaflet";

import type { Category, Place } from "../../api/client";
import { PlacePopup } from "../places/PlacePopup";

type Props = {
  place: Place;
  category?: Category;
};

export function PlaceMarker({ place, category }: Props) {
  return (
    <Marker position={[place.lat, place.lon]}>
      <Popup>
        <PlacePopup place={place} category={category} />
      </Popup>
    </Marker>
  );
}
