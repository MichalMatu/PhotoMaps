import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import type { Category, Photo, Place } from "../../api/client";
import { PlaceMarker } from "./PlaceMarker";

type Props = {
  places: Place[];
  categories: Category[];
  photosByPlaceId: Record<string, Photo[]>;
  onPhotoUploaded?: () => void;
};

const WROCLAW_CENTER: [number, number] = [51.1079, 17.0385];

function MapSizeUpdater() {
  const map = useMap();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => map.invalidateSize());
    const timeoutId = window.setTimeout(() => map.invalidateSize(), 250);
    const handleResize = () => map.invalidateSize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  return null;
}

export function PlaceMap({ places, categories, photosByPlaceId, onPhotoUploaded }: Props) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <MapContainer center={WROCLAW_CENTER} zoom={13} className="place-map" scrollWheelZoom>
      <MapSizeUpdater />
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
