import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import type { PlaceMapItem } from "../../api/client";
import { DistanceMeasureTool } from "./DistanceMeasureTool";
import { PlaceMarker } from "./PlaceMarker";

type Props = {
  places: PlaceMapItem[];
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

function clusterIcon(count: number) {
  return L.divIcon({
    className: "place-cluster-marker",
    html: `<span>${count}</span>`,
    iconAnchor: [24, 24],
    iconSize: [48, 48],
  });
}

type PlaceCluster = {
  id: string;
  lat: number;
  lon: number;
  places: PlaceMapItem[];
};

function clusterPlaces(places: PlaceMapItem[], zoom: number): PlaceCluster[] {
  if (zoom >= 15) {
    return places.map((place) => ({
      id: place.id,
      lat: place.lat,
      lon: place.lon,
      places: [place],
    }));
  }

  const gridSize = zoom <= 12 ? 0.035 : zoom <= 13 ? 0.02 : 0.01;
  const groups = new Map<string, PlaceMapItem[]>();
  for (const place of places) {
    const key = `${Math.round(place.lat / gridSize)}:${Math.round(place.lon / gridSize)}`;
    groups.set(key, [...(groups.get(key) ?? []), place]);
  }

  return Array.from(groups.entries()).map(([id, group]) => ({
    id,
    lat: group.reduce((sum, place) => sum + place.lat, 0) / group.length,
    lon: group.reduce((sum, place) => sum + place.lon, 0) / group.length,
    places: group,
  }));
}

function PlaceLayer({ onPhotoUploaded, places }: Props) {
  const map = useMap();
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(map.getZoom());
  const clusters = clusterPlaces(places, zoom);

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  useEffect(() => {
    if (expandedPlaceId && !places.some((place) => place.id === expandedPlaceId)) {
      setExpandedPlaceId(null);
    }
  }, [expandedPlaceId, places]);

  return (
    <>
      <FanCloseEvents onClose={() => setExpandedPlaceId(null)} />
      {clusters.map((cluster) => {
        if (cluster.places.length > 1 && zoom < 15) {
          return (
            <Marker
              icon={clusterIcon(cluster.places.length)}
              key={cluster.id}
              position={[cluster.lat, cluster.lon]}
              title={`${cluster.places.length} miejsc`}
              eventHandlers={{
                click: () => map.flyTo([cluster.lat, cluster.lon], Math.min(15, zoom + 2)),
              }}
            />
          );
        }

        const place = cluster.places[0];
        return (
          <PlaceMarker
            key={place.id}
            place={place}
            photos={place.photos}
            isExpanded={expandedPlaceId === place.id}
            onCloseFan={() => setExpandedPlaceId(null)}
            onPhotoUploaded={onPhotoUploaded}
            onToggleFan={() => setExpandedPlaceId((currentPlaceId) => (currentPlaceId === place.id ? null : place.id))}
          />
        );
      })}
    </>
  );
}

export function PlaceMap({ places, onPhotoUploaded }: Props) {
  return (
    <MapContainer center={WROCLAW_CENTER} zoom={13} className="place-map" scrollWheelZoom zoomControl={false}>
      <MapSizeUpdater />
      <DistanceMeasureTool />
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PlaceLayer places={places} onPhotoUploaded={onPhotoUploaded} />
    </MapContainer>
  );
}
