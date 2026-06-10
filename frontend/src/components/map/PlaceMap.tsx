import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer } from "react-leaflet";

import type { Category, Photo, Place } from "../../api/client";
import { PlaceMarker } from "./PlaceMarker";

type Props = {
  places: Place[];
  categories: Category[];
  photosByPlaceId: Record<string, Photo[]>;
  onPhotoUploaded?: () => void;
};

const WROCLAW_CENTER: [number, number] = [51.1079, 17.0385];

export function PlaceMap({ places, categories, photosByPlaceId, onPhotoUploaded }: Props) {
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
          photos={photosByPlaceId[place.id] ?? []}
          category={place.category_id ? categoryById.get(place.category_id) : undefined}
          onPhotoUploaded={onPhotoUploaded}
        />
      ))}
    </MapContainer>
  );
}
