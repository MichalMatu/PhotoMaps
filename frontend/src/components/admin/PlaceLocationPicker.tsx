import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

type Position = {
  lat: number;
  lon: number;
};

type Props = {
  position: Position;
  onChange: (position: Position) => void;
};

const pickerIcon = L.divIcon({
  className: "place-marker-icon",
  html: "<span></span>",
  iconAnchor: [14, 34],
  iconSize: [28, 34],
});

function roundedPosition(lat: number, lon: number): Position {
  return {
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
  };
}

function LocationPickerEvents({ onChange }: Pick<Props, "onChange">) {
  useMapEvents({
    click: (event) => {
      onChange(roundedPosition(event.latlng.lat, event.latlng.lng));
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

export function PlaceLocationPicker({ onChange, position }: Props) {
  const markerPosition: [number, number] = [position.lat, position.lon];

  return (
    <div className="location-picker">
      <div className="location-picker-map">
        <MapContainer center={markerPosition} zoom={15} className="location-map" scrollWheelZoom>
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
                onChange(roundedPosition(nextPosition.lat, nextPosition.lng));
              },
            }}
            icon={pickerIcon}
            position={markerPosition}
          />
        </MapContainer>
      </div>
      <p className="location-readout">
        {position.lat.toFixed(6)}, {position.lon.toFixed(6)}
      </p>
    </div>
  );
}
