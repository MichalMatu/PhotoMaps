import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import type { PlaceMapItem } from "../../api/client";
import { DistanceMeasureTool } from "./DistanceMeasureTool";
import { MapPhotoViewer } from "./MapPhotoViewer";
import { MemorySheet } from "./MemorySheet";
import { PhotoDetailModal } from "./PhotoDetailModal";
import { PlaceMarker } from "./PlaceMarker";
import { findPlaceFanItem, type PlaceMapVisualItem } from "./placePreview";
import { ReportSheet } from "./ReportSheet";
import { SystemModal } from "../admin/SystemModal";

type Props = {
  places: PlaceMapItem[];
};

type VisualTarget = {
  id: string;
  kind: PlaceMapVisualItem["kind"];
  placeId: string;
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

function PlaceLayer({ places }: Props) {
  const map = useMap();
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [memoryPlace, setMemoryPlace] = useState<PlaceMapItem | null>(null);
  const [visualDetail, setVisualDetail] = useState<VisualTarget | null>(null);
  const [visualPreview, setVisualPreview] = useState<VisualTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<VisualTarget | null>(null);
  const [isThanksOpen, setIsThanksOpen] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());
  const clusters = clusterPlaces(places, zoom);
  const previewPlace = visualPreview ? places.find((place) => place.id === visualPreview.placeId) ?? null : null;
  const previewItem = previewPlace && visualPreview ? findPlaceFanItem(previewPlace, visualPreview) : null;
  const detailPlace = visualDetail ? places.find((place) => place.id === visualDetail.placeId) ?? null : null;
  const detailItem = detailPlace && visualDetail ? findPlaceFanItem(detailPlace, visualDetail) : null;
  const reportPlace = reportTarget ? places.find((place) => place.id === reportTarget.placeId) ?? null : null;
  const reportItem = reportPlace && reportTarget ? findPlaceFanItem(reportPlace, reportTarget) : null;

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  useEffect(() => {
    if (expandedPlaceId && !places.some((place) => place.id === expandedPlaceId)) {
      setExpandedPlaceId(null);
    }
    if (memoryPlace && !places.some((place) => place.id === memoryPlace.id)) {
      setMemoryPlace(null);
    }
    if (visualPreview && !places.some((place) => place.id === visualPreview.placeId)) {
      setVisualPreview(null);
    }
    if (visualDetail && !places.some((place) => place.id === visualDetail.placeId)) {
      setVisualDetail(null);
    }
    if (reportTarget && !places.some((place) => place.id === reportTarget.placeId)) {
      setReportTarget(null);
    }
  }, [expandedPlaceId, memoryPlace, places, reportTarget, visualDetail, visualPreview]);

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
            isExpanded={expandedPlaceId === place.id}
            onMemoryOpen={setMemoryPlace}
            onVisualPreview={(nextPlace, nextItem) => {
              setVisualPreview({ id: nextItem.id, kind: nextItem.kind, placeId: nextPlace.id });
            }}
            onToggleFan={() => setExpandedPlaceId((currentPlaceId) => (currentPlaceId === place.id ? null : place.id))}
          />
        );
      })}
      <MemorySheet
        place={memoryPlace}
        onClose={() => setMemoryPlace(null)}
        onUploaded={() => {
          setMemoryPlace(null);
          setIsThanksOpen(true);
        }}
      />
      {previewItem && previewPlace ? (
        <MapPhotoViewer
          item={previewItem}
          place={previewPlace}
          onClose={() => setVisualPreview(null)}
          onOpenDetails={() => {
            setVisualDetail({ id: previewItem.id, kind: previewItem.kind, placeId: previewPlace.id });
            setVisualPreview(null);
          }}
        />
      ) : null}
      {detailItem && detailPlace ? (
        <PhotoDetailModal
          item={detailItem}
          place={detailPlace}
          onReport={() => setReportTarget({ id: detailItem.id, kind: detailItem.kind, placeId: detailPlace.id })}
          onClose={() => {
            setVisualDetail(null);
          }}
        />
      ) : null}
      <ReportSheet
        target={reportItem && reportPlace ? { item: reportItem, place: reportPlace } : null}
        onClose={() => setReportTarget(null)}
      />
      {isThanksOpen ? (
        <SystemModal
          eyebrow="Dziękujemy"
          title="Pamiątka trafiła do moderacji"
          message="Pamiątka została dodana i pojawi się publicznie po zatwierdzeniu przez redakcję."
          confirmLabel="OK"
          onClose={() => setIsThanksOpen(false)}
        />
      ) : null}
    </>
  );
}

export function PlaceMap({ places }: Props) {
  return (
    <MapContainer center={WROCLAW_CENTER} zoom={13} className="place-map" scrollWheelZoom zoomControl={false}>
      <MapSizeUpdater />
      <DistanceMeasureTool />
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PlaceLayer places={places} />
    </MapContainer>
  );
}
