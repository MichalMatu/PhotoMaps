import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { Photo, Place } from "../../api/client";
import { PlaceMarker } from "./PlaceMarker";

type Props = {
  places: Place[];
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

function FanCloseEvents({ onClose }: { onClose: () => void }) {
  useMapEvents({
    click: onClose,
  });

  return null;
}

export function PlaceMap({ places, photosByPlaceId, onPhotoUploaded }: Props) {
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    if (expandedPlaceId && !places.some((place) => place.id === expandedPlaceId)) {
      setExpandedPlaceId(null);
    }
  }, [expandedPlaceId, places]);

  return (
    <MapContainer center={WROCLAW_CENTER} zoom={13} className="place-map" scrollWheelZoom>
      <MapSizeUpdater />
      <FanCloseEvents onClose={() => setExpandedPlaceId(null)} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => (
        <PlaceMarker
          key={place.id}
          place={place}
          photos={photosByPlaceId[place.id] ?? []}
          isExpanded={expandedPlaceId === place.id}
          onCloseFan={() => setExpandedPlaceId(null)}
          onPhotoUploaded={onPhotoUploaded}
          onToggleFan={() => setExpandedPlaceId((currentPlaceId) => (currentPlaceId === place.id ? null : place.id))}
        />
      ))}
    </MapContainer>
  );
}
