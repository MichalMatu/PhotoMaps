import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapPin, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";

import type { GuideRoutePoint } from "../../api/types";
import {
  normalizeGuideRoutePoint,
  removeGuideRoutePoint,
  replaceGuideRoutePoint,
  routePointsFromPlaces,
} from "./guideRoutePointEditorState";
import { AdminActionIconButton } from "./AdminActionIconButton";

type RoutePointEditorPlace = {
  id: string;
  lat: number;
  lon: number;
  title: string;
};

type Props = {
  isPlacesLoading: boolean;
  onChange: (points: GuideRoutePoint[]) => void;
  places: RoutePointEditorPlace[];
  points: GuideRoutePoint[];
};

const WROCLAW_CENTER: [number, number] = [51.1079, 17.0385];

function routePointIcon(index: number) {
  return L.divIcon({
    className: "guide-route-editor-marker",
    html: `<span>${index + 1}</span>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });
}

function routePointLabel(point: GuideRoutePoint) {
  return `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`;
}

function pointsToPositions(points: GuideRoutePoint[]): [number, number][] {
  return points.map((point) => [point.lat, point.lon]);
}

function GuideRouteEditorViewport({
  fitRequest,
  places,
  points,
}: Pick<Props, "places" | "points"> & { fitRequest: number }) {
  const map = useMap();
  const viewportContent = useRef({ places, points });
  viewportContent.current = { places, points };

  useEffect(() => {
    const { places: currentPlaces, points: currentPoints } = viewportContent.current;
    const positions = [
      ...pointsToPositions(currentPoints),
      ...currentPlaces.map((place) => [place.lat, place.lon] as [number, number]),
    ];
    if (positions.length === 0) {
      map.setView(WROCLAW_CENTER, 13);
    } else if (positions.length === 1) {
      map.setView(positions[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(positions), { maxZoom: 16, padding: [28, 28] });
    }

    const frameId = window.requestAnimationFrame(() => map.invalidateSize());
    const timeoutId = window.setTimeout(() => map.invalidateSize(), 250);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [fitRequest, map]);

  return null;
}

function GuideRouteEditorEvents({ onAddPoint }: { onAddPoint: (point: GuideRoutePoint) => void }) {
  useMapEvents({
    click: (event) => {
      onAddPoint(normalizeGuideRoutePoint(event.latlng.lat, event.latlng.lng));
    },
  });

  return null;
}

function GuideRouteEditorMap({
  fitRequest,
  onChange,
  places,
  points,
}: Omit<Props, "isPlacesLoading"> & { fitRequest: number }) {
  const center = points[0] ? ([points[0].lat, points[0].lon] as [number, number]) : WROCLAW_CENTER;
  const positions = useMemo(() => pointsToPositions(points), [points]);
  const routePointIcons = useMemo(() => points.map((_, index) => routePointIcon(index)), [points]);

  return (
    <MapContainer center={center} className="guide-route-editor-map" scrollWheelZoom zoom={14}>
      <GuideRouteEditorViewport fitRequest={fitRequest} places={places} points={points} />
      <GuideRouteEditorEvents onAddPoint={(point) => onChange([...points, point])} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.length > 1 ? (
        <Polyline
          pathOptions={{ className: "guide-route-editor-line", opacity: 0.88, weight: 4 }}
          positions={positions}
        />
      ) : null}
      {places.map((place, index) => (
        <CircleMarker
          center={[place.lat, place.lon]}
          className="guide-route-editor-stop"
          key={place.id}
          pathOptions={{ fillOpacity: 0.88, opacity: 0.95, weight: 2 }}
          radius={7}
        >
          <title>{`${index + 1}. ${place.title}`}</title>
        </CircleMarker>
      ))}
      {points.map((point, index) => (
        <Marker
          draggable
          eventHandlers={{
            dragend: (event) => {
              const marker = event.target as L.Marker;
              const nextPosition = marker.getLatLng();
              onChange(
                replaceGuideRoutePoint(points, index, normalizeGuideRoutePoint(nextPosition.lat, nextPosition.lng)),
              );
            },
          }}
          icon={routePointIcons[index]}
          key={`${index}:${point.lat}:${point.lon}`}
          position={[point.lat, point.lon]}
        />
      ))}
    </MapContainer>
  );
}

export function GuideRoutePointEditor({ isPlacesLoading, onChange, places, points }: Props) {
  const canUsePlaces = places.length > 0 && !isPlacesLoading;
  const [fitRequest, setFitRequest] = useState(0);

  function fitToCurrentRoute() {
    setFitRequest((currentFitRequest) => currentFitRequest + 1);
  }

  function usePlacesAsRoutePoints() {
    onChange(routePointsFromPlaces(places));
    fitToCurrentRoute();
  }

  return (
    <section className="guide-route-editor" aria-label="Przebieg trasy">
      <div className="guide-route-editor-header">
        <div>
          <strong>Przebieg na mapie</strong>
          <span>{points.length === 1 ? "1 punkt" : `${points.length} punktów`}</span>
        </div>
        <div className="guide-route-editor-actions">
          <button
            className="ui-button ui-button--secondary"
            type="button"
            disabled={!canUsePlaces}
            onClick={usePlacesAsRoutePoints}
          >
            <MapPin aria-hidden="true" size={16} />
            Użyj miejsc
          </button>
          <button
            className="ui-button ui-button--ghost"
            type="button"
            disabled={points.length === 0}
            onClick={() => onChange([])}
          >
            <RotateCcw aria-hidden="true" size={16} />
            Wyczyść
          </button>
        </div>
      </div>
      <div className="guide-route-editor-body">
        <GuideRouteEditorMap fitRequest={fitRequest} places={places} points={points} onChange={onChange} />
        <div className="guide-route-editor-list" aria-label="Punkty przebiegu">
          {points.map((point, index) => (
            <div className="guide-route-editor-point" key={`${index}:${point.lat}:${point.lon}`}>
              <span>{index + 1}</span>
              <code>{routePointLabel(point)}</code>
              <AdminActionIconButton
                icon={Trash2}
                label={`Usuń punkt ${index + 1}`}
                tone="danger"
                onClick={() => onChange(removeGuideRoutePoint(points, index))}
              />
            </div>
          ))}
          {points.length === 0 ? <p className="ui-empty">Brak punktów przebiegu.</p> : null}
        </div>
      </div>
    </section>
  );
}
