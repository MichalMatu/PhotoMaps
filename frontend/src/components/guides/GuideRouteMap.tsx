import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer, ZoomControl, useMap } from "react-leaflet";

import type { GuideRoutePoint, PublicGuidePlacePreview } from "../../api/types";

type Props = {
  places: PublicGuidePlacePreview[];
  routePoints?: GuideRoutePoint[];
  title: string;
};

type RoutePoint = {
  id: string;
  lat: number;
  lon: number;
  title: string;
};

const ROUTE_MARKER_ICON_SIZE = 32;
const routeMarkerIconCache = new Map<number, L.DivIcon>();
const EMPTY_ROUTE_POINTS: GuideRoutePoint[] = [];

function routeMarkerIcon(index: number) {
  const cachedIcon = routeMarkerIconCache.get(index);
  if (cachedIcon) {
    return cachedIcon;
  }

  const label = String(index + 1);
  const icon = L.divIcon({
    className: "guide-route-marker",
    html: `<span>${label}</span>`,
    iconAnchor: [ROUTE_MARKER_ICON_SIZE / 2, ROUTE_MARKER_ICON_SIZE / 2],
    iconSize: [ROUTE_MARKER_ICON_SIZE, ROUTE_MARKER_ICON_SIZE],
  });
  routeMarkerIconCache.set(index, icon);

  return icon;
}

function isRoutePoint(place: PublicGuidePlacePreview): place is PublicGuidePlacePreview & RoutePoint {
  return Number.isFinite(place.lat) && Number.isFinite(place.lon);
}

function GuideRouteViewport({ points }: { points: GuideRoutePoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize();
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lon], 15, { animate: false });
        return;
      }

      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lon]));
      map.fitBounds(bounds, {
        animate: false,
        maxZoom: 15,
        padding: [36, 36],
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [map, points]);

  return null;
}

export function GuideRouteMap({ places, routePoints = EMPTY_ROUTE_POINTS, title }: Props) {
  const points = useMemo(() => places.filter(isRoutePoint), [places]);
  const positions = useMemo(() => points.map((point) => [point.lat, point.lon] as [number, number]), [points]);
  const routePositions = useMemo(
    () => (routePoints.length > 1 ? routePoints : points).map((point) => [point.lat, point.lon] as [number, number]),
    [points, routePoints],
  );
  const viewportPoints = routePoints.length > 1 ? routePoints : points;
  const center = routePositions[0] ?? positions[0] ?? ([51.1079, 17.0385] as [number, number]);

  if (points.length === 0 && routePositions.length === 0) {
    return (
      <div className="guide-route-map-shell guide-route-map-shell--empty" role="status">
        <span>Brak punktów trasy</span>
      </div>
    );
  }

  return (
    <figure className="guide-route-map-shell" aria-label={`Mapa trasy ${title}`}>
      <MapContainer center={center} className="guide-route-map" scrollWheelZoom={false} zoom={14} zoomControl={false}>
        <GuideRouteViewport points={viewportPoints} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePositions.length > 1 ? (
          <Polyline
            pathOptions={{ className: "guide-route-line", opacity: 0.86, weight: 4 }}
            positions={routePositions}
          />
        ) : null}
        {points.map((point, index) => (
          <Marker
            alt={`${index + 1}. ${point.title}`}
            icon={routeMarkerIcon(index)}
            interactive={false}
            keyboard={false}
            key={point.id}
            position={[point.lat, point.lon]}
            title={`${index + 1}. ${point.title}`}
            zIndexOffset={1000 + index}
          />
        ))}
        <ZoomControl position="bottomright" />
      </MapContainer>
    </figure>
  );
}
