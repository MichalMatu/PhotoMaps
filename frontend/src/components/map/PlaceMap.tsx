import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import type { City, PlaceMapItem } from "../../api/client";
import { SystemModal } from "../ui/SystemModal";
import { DistanceMeasureTool } from "./DistanceMeasureTool";
import { MemorySheet } from "./MemorySheet";
import { PhotoDetailModal } from "./PhotoDetailModal";
import { PinnedMediaBoard, type PinMediaRequest, usePinnedMediaBoard } from "./PinnedMediaBoardLayer";
import { PlaceMarker } from "./PlaceMarker";
import { findPlaceFanItem, type PlaceMapVisualItem } from "./placePreview";
import { ReportSheet } from "./ReportSheet";

type Props = {
  mapCity?: City | null;
  places: PlaceMapItem[];
};

type VisualTarget = {
  id: string;
  kind: PlaceMapVisualItem["kind"];
  placeId: string;
};

type PlaceLayerProps = {
  onPinMedia: (request: PinMediaRequest) => boolean;
  places: PlaceMapItem[];
};

const DEFAULT_CENTER: [number, number] = [51.1079, 17.0385];

function MapSizeUpdater() {
  const map = useMap();

  useEffect(() => {
    let resizeFrameId: number | null = null;
    const scheduleInvalidate = () => {
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        map.invalidateSize();
      });
    };
    const timeoutId = window.setTimeout(scheduleInvalidate, 250);
    const handleResize = () => scheduleInvalidate();
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => scheduleInvalidate());

    window.addEventListener("resize", handleResize);
    resizeObserver?.observe(map.getContainer());
    scheduleInvalidate();

    return () => {
      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  }, [map]);

  return null;
}

function MapCloseEvents({ onClose }: { onClose: () => void }) {
  useMapEvents({
    click: onClose,
  });

  return null;
}

function PlaceLayer({ onPinMedia, places }: PlaceLayerProps) {
  const map = useMap();
  const placesMotionSignature = useMemo(
    () =>
      places
        .map((place) => {
          const previewSignature = place.preview_items.map((item) => `${item.kind}:${item.id}`).join(",");
          return `${place.id}:${place.cover_photo?.id ?? "none"}:${previewSignature}`;
        })
        .join("|"),
    [places],
  );
  const previousPlacesMotionSignature = useRef<string | null>(null);
  const shouldAnimateMarkers = previousPlacesMotionSignature.current !== placesMotionSignature;
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [memoryPlace, setMemoryPlace] = useState<PlaceMapItem | null>(null);
  const [visualDetail, setVisualDetail] = useState<VisualTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<VisualTarget | null>(null);
  const [isThanksOpen, setIsThanksOpen] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());
  const detailPlace = visualDetail ? (places.find((place) => place.id === visualDetail.placeId) ?? null) : null;
  const detailItem = detailPlace && visualDetail ? findPlaceFanItem(detailPlace, visualDetail) : null;
  const reportPlace = reportTarget ? (places.find((place) => place.id === reportTarget.placeId) ?? null) : null;
  const reportItem = reportPlace && reportTarget ? findPlaceFanItem(reportPlace, reportTarget) : null;

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  useEffect(() => {
    previousPlacesMotionSignature.current = placesMotionSignature;
  }, [placesMotionSignature]);

  useEffect(() => {
    if (expandedPlaceId && !places.some((place) => place.id === expandedPlaceId)) {
      setExpandedPlaceId(null);
    }
    if (memoryPlace && !places.some((place) => place.id === memoryPlace.id)) {
      setMemoryPlace(null);
    }
    if (visualDetail && !places.some((place) => place.id === visualDetail.placeId)) {
      setVisualDetail(null);
    }
    if (reportTarget && !places.some((place) => place.id === reportTarget.placeId)) {
      setReportTarget(null);
    }
  }, [expandedPlaceId, memoryPlace, places, reportTarget, visualDetail]);

  return (
    <>
      <MapCloseEvents
        onClose={() => {
          setExpandedPlaceId(null);
          setMemoryPlace(null);
        }}
      />
      {places.map((place, index) => (
        <PlaceMarker
          key={`${placesMotionSignature}:${place.id}`}
          place={place}
          isExpanded={expandedPlaceId === place.id}
          enterIndex={index}
          isEntering={shouldAnimateMarkers}
          onMemoryOpen={setMemoryPlace}
          onMediaOpen={(nextPlace, nextItem) => {
            setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: nextPlace.id });
          }}
          onToggleFan={() => setExpandedPlaceId((currentPlaceId) => (currentPlaceId === place.id ? null : place.id))}
          zoom={zoom}
        />
      ))}
      <MemorySheet
        place={memoryPlace}
        onClose={() => setMemoryPlace(null)}
        onUploaded={() => {
          setMemoryPlace(null);
          setIsThanksOpen(true);
        }}
      />
      {detailItem && detailPlace ? (
        <PhotoDetailModal
          item={detailItem}
          place={detailPlace}
          onPin={(pinRequest) => {
            const didPin = onPinMedia({ item: detailItem, place: detailPlace, ...pinRequest });
            if (didPin) {
              setVisualDetail(null);
            }

            return didPin;
          }}
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

function PlaceMapContent({ places }: Pick<Props, "places">) {
  const pinnedMediaBoard = usePinnedMediaBoard(places);

  return (
    <>
      <MapSizeUpdater />
      <DistanceMeasureTool />
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PlaceLayer places={places} onPinMedia={pinnedMediaBoard.pinMedia} />
      <PinnedMediaBoard
        cards={pinnedMediaBoard.cards}
        notice={pinnedMediaBoard.notice}
        onBringToFront={pinnedMediaBoard.onBringToFront}
        onLayoutChange={pinnedMediaBoard.onLayoutChange}
        onRemove={pinnedMediaBoard.onRemove}
      />
    </>
  );
}

export function PlaceMap({ mapCity = null, places }: Props) {
  const center: [number, number] = mapCity ? [mapCity.lat, mapCity.lon] : DEFAULT_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={mapCity?.default_zoom ?? 13}
      className="place-map"
      key={mapCity?.id ?? "default"}
      scrollWheelZoom
      zoomControl={false}
    >
      <PlaceMapContent places={places} />
    </MapContainer>
  );
}
