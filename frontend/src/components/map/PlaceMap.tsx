import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";

import type { Category, Place } from "../../api/client";
import { PlaceMarker } from "./PlaceMarker";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type Props = {
  places: Place[];
  categories: Category[];
};

const WROCLAW_CENTER: [number, number] = [51.1079, 17.0385];

export function PlaceMap({ places, categories }: Props) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <MapContainer center={WROCLAW_CENTER} zoom={13} className="place-map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          category={place.category_id ? categoryById.get(place.category_id) : undefined}
        />
      ))}
    </MapContainer>
  );
}
