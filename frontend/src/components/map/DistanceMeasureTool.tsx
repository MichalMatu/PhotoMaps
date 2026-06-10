import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CircleMarker, Marker, Polyline, useMapEvents } from "react-leaflet";
import { divIcon, latLng, type LatLngLiteral } from "leaflet";

type ContextMenuState = {
  latLng: LatLngLiteral;
  x: number;
  y: number;
};

type Segment = {
  distanceMeters: number;
  from: LatLngLiteral;
  midpoint: LatLngLiteral;
  to: LatLngLiteral;
};

function toLatLngLiteral(value: LatLngLiteral): LatLngLiteral {
  return {
    lat: value.lat,
    lng: value.lng,
  };
}

function distanceMeters(from: LatLngLiteral, to: LatLngLiteral): number {
  return latLng(from.lat, from.lng).distanceTo(latLng(to.lat, to.lng));
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const precision = meters >= 10_000 ? 1 : 2;
    return `${(meters / 1000).toFixed(precision)} km`;
  }

  return `${Math.round(meters)} m`;
}

function midpoint(from: LatLngLiteral, to: LatLngLiteral): LatLngLiteral {
  return {
    lat: (from.lat + to.lat) / 2,
    lng: (from.lng + to.lng) / 2,
  };
}

function clampMenuPosition(x: number, y: number) {
  const margin = 10;
  const menuWidth = 230;
  const menuHeight = 178;

  return {
    left: Math.max(margin, Math.min(x, window.innerWidth - menuWidth - margin)),
    top: Math.max(margin, Math.min(y, window.innerHeight - menuHeight - margin)),
  };
}

function segmentLabelIcon(label: string) {
  return divIcon({
    className: "measure-segment-label",
    html: `<span>${label}</span>`,
    iconAnchor: [28, 12],
    iconSize: [56, 24],
  });
}

export function DistanceMeasureTool() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [points, setPoints] = useState<LatLngLiteral[]>([]);

  const segments = useMemo<Segment[]>(
    () =>
      points.slice(1).map((point, index) => {
        const previousPoint = points[index];
        return {
          distanceMeters: distanceMeters(previousPoint, point),
          from: previousPoint,
          midpoint: midpoint(previousPoint, point),
          to: point,
        };
      }),
    [points],
  );

  const totalDistanceMeters = useMemo(
    () => segments.reduce((total, segment) => total + segment.distanceMeters, 0),
    [segments],
  );

  useMapEvents({
    click(event) {
      setContextMenu(null);
      if (isMeasuring) {
        setPoints((currentPoints) => [...currentPoints, toLatLngLiteral(event.latlng)]);
      }
    },
    contextmenu(event) {
      event.originalEvent.preventDefault();
      setContextMenu({
        latLng: toLatLngLiteral(event.latlng),
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY,
      });
    },
  });

  useEffect(() => {
    function handlePointerDown() {
      setContextMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function startMeasurement(point: LatLngLiteral) {
    setPoints([point]);
    setIsMeasuring(true);
    setContextMenu(null);
  }

  function addPoint(point: LatLngLiteral) {
    setPoints((currentPoints) => [...currentPoints, point]);
    setIsMeasuring(true);
    setContextMenu(null);
  }

  function undoPoint() {
    setPoints((currentPoints) => {
      const nextPoints = currentPoints.slice(0, -1);
      if (nextPoints.length === 0) {
        setIsMeasuring(false);
      }
      return nextPoints;
    });
  }

  function clearMeasurement() {
    setPoints([]);
    setIsMeasuring(false);
    setContextMenu(null);
  }

  function finishMeasurement() {
    setIsMeasuring(false);
    setContextMenu(null);
  }

  const menuPosition = contextMenu ? clampMenuPosition(contextMenu.x, contextMenu.y) : null;

  return (
    <>
      {points.length > 1 ? (
        <Polyline
          pathOptions={{ color: "#111413", opacity: 0.86, weight: 3 }}
          positions={points}
        />
      ) : null}
      {points.map((point, index) => (
        <CircleMarker
          center={point}
          key={`${point.lat}-${point.lng}-${index}`}
          pathOptions={{ color: "#111413", fillColor: "#111413", fillOpacity: 1, weight: 2 }}
          radius={5}
        />
      ))}
      {segments.map((segment, index) => (
        <Marker
          icon={segmentLabelIcon(formatDistance(segment.distanceMeters))}
          interactive={false}
          key={`${segment.from.lat}-${segment.from.lng}-${segment.to.lat}-${segment.to.lng}-${index}`}
          position={segment.midpoint}
        />
      ))}
      {contextMenu && menuPosition
        ? createPortal(
            <div
              className="map-context-menu"
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.preventDefault()}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
              role="menu"
              style={menuPosition}
            >
              <div className="map-context-menu-coords">
                {contextMenu.latLng.lat.toFixed(6)}, {contextMenu.latLng.lng.toFixed(6)}
              </div>
              {isMeasuring ? (
                <button type="button" onClick={() => addPoint(contextMenu.latLng)}>
                  Dodaj punkt
                </button>
              ) : (
                <button type="button" onClick={() => startMeasurement(contextMenu.latLng)}>
                  Mierz od tego punktu
                </button>
              )}
              {points.length > 0 ? (
                <>
                  {!isMeasuring ? (
                    <button type="button" onClick={() => addPoint(contextMenu.latLng)}>
                      Kontynuuj pomiar
                    </button>
                  ) : null}
                  {isMeasuring ? (
                    <button type="button" onClick={finishMeasurement}>
                      Zakończ pomiar
                    </button>
                  ) : null}
                  <button className="map-context-menu-danger" type="button" onClick={clearMeasurement}>
                    Wyczyść pomiar
                  </button>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      {points.length > 0
        ? createPortal(
            <div className="measure-panel">
              <span>{isMeasuring ? "Pomiar aktywny" : "Pomiar"}</span>
              <strong>{formatDistance(totalDistanceMeters)}</strong>
              <div>
                <button type="button" disabled={points.length === 0} onClick={undoPoint}>
                  Cofnij
                </button>
                <button type="button" onClick={() => setIsMeasuring((currentValue) => !currentValue)}>
                  {isMeasuring ? "Zakończ" : "Kontynuuj"}
                </button>
                <button type="button" onClick={clearMeasurement}>
                  Wyczyść
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
