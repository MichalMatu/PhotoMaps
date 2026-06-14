import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import type { City, PlaceMapItem } from "../../api/client";
import { SystemModal } from "../ui/SystemModal";
import { DistanceMeasureTool } from "./DistanceMeasureTool";
import { MemorySheet } from "./MemorySheet";
import { PhotoDetailModal } from "./PhotoDetailModal";
import { PinnedMediaBoard, type PinnedMediaPlaceProjector } from "./PinnedMediaBoard";
import { PlaceMarker } from "./PlaceMarker";
import { findPlaceFanItem, type PlaceMapVisualItem } from "./placePreview";
import { type PinMediaRequest, usePinnedMediaBoard } from "./usePinnedMediaBoard";
import { ReportSheet } from "./ReportSheet";

type Props = {
  mapCity?: City | null;
  markerPlaces: PlaceMapItem[];
  onPinnedMediaVisibleChange: (isVisible: boolean) => void;
  pinnedMediaPlaces: PlaceMapItem[];
  showPinnedMedia: boolean;
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

function MapProjectionTracker({
  onProjectorChange,
}: {
  onProjectorChange: (projector: PinnedMediaPlaceProjector | null) => void;
}) {
  const map = useMap();
  const frameIdRef = useRef<number | null>(null);

  const updateProjector = useCallback(() => {
    if (frameIdRef.current !== null) {
      window.cancelAnimationFrame(frameIdRef.current);
    }

    frameIdRef.current = window.requestAnimationFrame(() => {
      frameIdRef.current = null;
      const containerRect = map.getContainer().getBoundingClientRect();
      const nextProjector: PinnedMediaPlaceProjector = (place) => {
        const point = map.latLngToContainerPoint([place.lat, place.lon]);
        if (point.x < 0 || point.y < 0 || point.x > containerRect.width || point.y > containerRect.height) {
          return null;
        }

        return {
          x: containerRect.left + point.x,
          y: containerRect.top + point.y,
        };
      };

      onProjectorChange(nextProjector);
    });
  }, [map, onProjectorChange]);

  useMapEvents({
    move: updateProjector,
    moveend: updateProjector,
    resize: updateProjector,
    zoom: updateProjector,
    zoomend: updateProjector,
  });

  useEffect(() => {
    updateProjector();

    return () => {
      if (frameIdRef.current !== null) {
        window.cancelAnimationFrame(frameIdRef.current);
      }
      onProjectorChange(null);
    };
  }, [onProjectorChange, updateProjector]);

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

export function PlaceMap({
  mapCity = null,
  markerPlaces,
  onPinnedMediaVisibleChange,
  pinnedMediaPlaces,
  showPinnedMedia,
}: Props) {
  const center: [number, number] = mapCity ? [mapCity.lat, mapCity.lon] : DEFAULT_CENTER;
  const { cards, notice, onBringToFront, onLayoutChange, onMediaSizeChange, onRemove, pinMedia } =
    usePinnedMediaBoard(pinnedMediaPlaces);
  const [projectPlacePoint, setProjectPlacePoint] = useState<PinnedMediaPlaceProjector | null>(null);
  const handleProjectorChange = useCallback((projector: PinnedMediaPlaceProjector | null) => {
    setProjectPlacePoint(() => projector);
  }, []);
  const handlePinMedia = useCallback(
    (request: PinMediaRequest) => {
      const didPin = pinMedia(request);
      onPinnedMediaVisibleChange(true);

      return didPin;
    },
    [onPinnedMediaVisibleChange, pinMedia],
  );

  return (
    <>
      <MapContainer
        center={center}
        zoom={mapCity?.default_zoom ?? 13}
        className="place-map"
        key={mapCity?.id ?? "default"}
        scrollWheelZoom
        zoomControl={false}
      >
        <MapSizeUpdater />
        <MapProjectionTracker onProjectorChange={handleProjectorChange} />
        <DistanceMeasureTool />
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PlaceLayer places={markerPlaces} onPinMedia={handlePinMedia} />
      </MapContainer>
      {showPinnedMedia ? (
        <PinnedMediaBoard
          cards={cards}
          notice={notice}
          onBringToFront={onBringToFront}
          onLayoutChange={onLayoutChange}
          onMediaSizeChange={onMediaSizeChange}
          onRemove={onRemove}
          projectPlacePoint={projectPlacePoint}
        />
      ) : null}
    </>
  );
}
