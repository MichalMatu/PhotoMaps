import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { type LocationPickerPosition, roundedLocationPickerPosition } from "./locationPickerLookup";

const pickerIcon = L.divIcon({
  className: "place-marker-icon",
  html: "<span></span>",
  iconAnchor: [14, 34],
  iconSize: [28, 34],
});

type Props = {
  onChange: (position: LocationPickerPosition) => void;
  position: LocationPickerPosition;
  zoom?: number;
};

function LocationPickerEvents({ onChange }: Pick<Props, "onChange">) {
  useMapEvents({
    click: (event) => {
      onChange(roundedLocationPickerPosition(event.latlng.lat, event.latlng.lng));
    },
  });

  return null;
}

function LocationMapSync({ position }: Pick<Props, "position">) {
  const map = useMap();

  useEffect(() => {
    const nextCenter: [number, number] = [position.lat, position.lon];
    map.setView(nextCenter, map.getZoom(), { animate: true });
    const frameId = window.requestAnimationFrame(() => map.invalidateSize());
    const timeoutId = window.setTimeout(() => map.invalidateSize(), 250);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [map, position.lat, position.lon]);

  return null;
}

export function LocationPickerMap({ onChange, position, zoom = 15 }: Props) {
  const markerPosition: [number, number] = [position.lat, position.lon];

  return (
    <MapContainer center={markerPosition} zoom={zoom} className="location-map" scrollWheelZoom>
      <LocationMapSync position={position} />
      <LocationPickerEvents onChange={onChange} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        draggable
        eventHandlers={{
          dragend: (event) => {
            const marker = event.target as L.Marker;
            const nextPosition = marker.getLatLng();
            onChange(roundedLocationPickerPosition(nextPosition.lat, nextPosition.lng));
          },
        }}
        icon={pickerIcon}
        position={markerPosition}
      />
    </MapContainer>
  );
}
