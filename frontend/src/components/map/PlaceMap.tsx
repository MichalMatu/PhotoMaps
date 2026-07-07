import "leaflet/dist/leaflet.css";
import { useQuery } from "@tanstack/react-query";
import type { Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

import { getPlacePhotos } from "../../api/media";
import type { AppConfigMap, PlaceCustomFieldDefinition, PlaceMapItem } from "../../api/types";
import { SystemModal } from "../ui/SystemModal";
import { DistanceMeasureTool } from "./DistanceMeasureTool";
import { MemorySheet } from "./MemorySheet";
import { MapCloseEvents } from "./MapCloseEvents";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";
import { MapInteractionLock } from "./mapInteractionLock";
import { MapPhotoGalleryGlass } from "./MapPhotoGalleryGlass";
import { MapPhotoGalleryPane } from "./MapPhotoGalleryPane";
import { PhotoDetailModal } from "./PhotoDetailModal";
import { PinnedMediaBoard, type PinnedMediaPlaceProjector } from "./PinnedMediaBoard";
import { PlaceMarker } from "./PlaceMarker";
import { resolveMapMarkerCollisions } from "./mapMarkerCollision";
import { getMapPlacePriority, limitMapMarkersByDensity } from "./mapMarkerDensity";
import type { MarkerDisplayOffset } from "./mapMarkerDisplayOffset";
import { limitMapMarkersByResolvedDensity } from "./mapMarkerSelection";
import { getPlaceMarkerLayout } from "./mapMarkerScale";
import { filterMapMarkersByViewport } from "./mapMarkerViewport";
import { findPlaceGalleryItem, getPlaceGalleryItems, type PlaceMapVisualItem } from "./placePreview";
import { useCenteredPlaceGallery } from "./useCenteredPlaceGallery";
import { type PinMediaRequest, usePinnedMediaBoard } from "./usePinnedMediaBoard";
import { ReportSheet } from "./ReportSheet";

type Props = {
  isAudioAutoplayEnabled: boolean;
  mapFallback: AppConfigMap;
  markerPlaces: PlaceMapItem[];
  onPinnedMediaVisibleChange: (isVisible: boolean) => void;
  pinnedMediaPlaces: PlaceMapItem[];
  placeCustomFieldDefinitions: PlaceCustomFieldDefinition[];
  showPinnedMedia: boolean;
};

type VisualTarget = {
  id: string;
  kind: PlaceMapVisualItem["kind"];
  placeId: string;
};

type PlaceLayerProps = {
  isAudioAutoplayEnabled: boolean;
  mapSettings: AppConfigMap;
  onPinMedia: (request: PinMediaRequest) => boolean;
  places: PlaceMapItem[];
  placeCustomFieldDefinitions: PlaceCustomFieldDefinition[];
};

type MapViewport = {
  centerLat: number;
  centerLon: number;
  height: number;
  width: number;
  zoom: number;
};

type ProjectedMarkerPlace = {
  height: number;
  place: PlaceMapItem;
  point: {
    x: number;
    y: number;
  };
  priority: number;
  width: number;
};

const EMPTY_PLACE_GALLERY_ITEMS: PlaceMapVisualItem[] = [];

function readMapViewport(map: LeafletMap): MapViewport {
  const size = map.getSize();
  const center = map.getCenter();

  return {
    centerLat: center.lat,
    centerLon: center.lng,
    height: size.y,
    width: size.x,
    zoom: map.getZoom(),
  };
}

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

function PlaceLayer({
  isAudioAutoplayEnabled,
  mapSettings,
  onPinMedia,
  places,
  placeCustomFieldDefinitions,
}: PlaceLayerProps) {
  const map = useMap();
  const [mapViewport, setMapViewport] = useState(() => readMapViewport(map));
  const refreshMapViewport = useCallback(() => {
    setMapViewport(readMapViewport(map));
  }, [map]);
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
  const [memoryPlace, setMemoryPlace] = useState<PlaceMapItem | null>(null);
  const [visualDetail, setVisualDetail] = useState<VisualTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<VisualTarget | null>(null);
  const [isThanksOpen, setIsThanksOpen] = useState(false);
  const zoom = mapViewport.zoom;
  const viewportCenterLat = mapViewport.centerLat;
  const viewportCenterLon = mapViewport.centerLon;
  const viewportHeight = mapViewport.height;
  const viewportWidth = mapViewport.width;
  const projectedPlaces = useMemo<ProjectedMarkerPlace[]>(() => {
    if (
      !Number.isFinite(viewportCenterLat) ||
      !Number.isFinite(viewportCenterLon) ||
      viewportHeight <= 0 ||
      viewportWidth <= 0
    ) {
      return [];
    }

    return places.map((place) => {
      const markerLayout = getPlaceMarkerLayout({
        editorialPriority: place.weight,
        markerScale: mapSettings.marker_scale,
        zoom,
      });
      const point = map.latLngToContainerPoint([place.lat, place.lon]);

      return {
        height: markerLayout.height,
        place,
        point: { x: point.x, y: point.y },
        priority: getMapPlacePriority(place, mapSettings.marker_priority),
        width: markerLayout.width,
      };
    });
  }, [
    map,
    mapSettings.marker_priority,
    mapSettings.marker_scale,
    places,
    viewportCenterLat,
    viewportCenterLon,
    viewportHeight,
    viewportWidth,
    zoom,
  ]);
  const viewportProjectedPlaces = useMemo(
    () =>
      filterMapMarkersByViewport(projectedPlaces, {
        viewportHeight,
        viewportWidth,
      }),
    [projectedPlaces, viewportHeight, viewportWidth],
  );
  const markerProjectedPlaces = useMemo(() => {
    const densityPlaces = limitMapMarkersByDensity(
      viewportProjectedPlaces.map((projectedPlace) => projectedPlace.place),
      {
        markerDensity: mapSettings.marker_density,
        markerPriority: mapSettings.marker_priority,
        viewportHeight,
        viewportWidth,
        zoom,
      },
    );
    const densityPlaceIds = new Set(densityPlaces.map((place) => place.id));
    const densityProjectedPlaces = viewportProjectedPlaces.filter((projectedPlace) =>
      densityPlaceIds.has(projectedPlace.place.id),
    );

    return limitMapMarkersByResolvedDensity(
      densityProjectedPlaces.map((projectedPlace) => ({
        ...projectedPlace,
        cityId: projectedPlace.place.city_id,
        id: projectedPlace.place.id,
      })),
      {
        viewportHeight,
        viewportWidth,
        zoom,
      },
    );
  }, [
    mapSettings.marker_density,
    mapSettings.marker_priority,
    viewportHeight,
    viewportProjectedPlaces,
    viewportWidth,
    zoom,
  ]);
  const markerPlaces = useMemo(
    () => markerProjectedPlaces.map((projectedPlace) => projectedPlace.place),
    [markerProjectedPlaces],
  );
  const markerDisplayOffsets = useMemo(() => {
    const collisionLayouts = resolveMapMarkerCollisions(
      markerProjectedPlaces.map((projectedPlace) => ({
        height: projectedPlace.height,
        id: projectedPlace.place.id,
        point: projectedPlace.point,
        priority: projectedPlace.priority,
        width: projectedPlace.width,
      })),
      {
        viewportHeight,
        viewportWidth,
        zoom,
      },
    );

    return new Map<string, MarkerDisplayOffset>(collisionLayouts.map((layout) => [layout.id, layout.offset]));
  }, [markerProjectedPlaces, viewportHeight, viewportWidth, zoom]);
  const { closePlaceGallery, expandedPlace, expandedPlaceId, isGalleryInteractionLocked, togglePlaceGallery } =
    useCenteredPlaceGallery(map, markerPlaces);
  const expandedPlacePhotosQuery = useQuery({
    queryKey: ["place", expandedPlace?.id, "photos"],
    queryFn: () => getPlacePhotos(expandedPlace?.id ?? ""),
    enabled: expandedPlace !== null,
    staleTime: 60_000,
  });
  const expandedPlacePhotos = expandedPlacePhotosQuery.data ?? null;
  const galleryItemsByPlaceId = useMemo(() => {
    return new Map(
      markerPlaces.map((place) => [
        place.id,
        getPlaceGalleryItems(place, expandedPlaceId === place.id ? expandedPlacePhotos : null),
      ]),
    );
  }, [expandedPlaceId, expandedPlacePhotos, markerPlaces]);
  const detailPlace = visualDetail ? (places.find((place) => place.id === visualDetail.placeId) ?? null) : null;
  const detailPlacePhotos = detailPlace?.id === expandedPlace?.id ? expandedPlacePhotos : null;
  const detailItem =
    detailPlace && visualDetail ? findPlaceGalleryItem(detailPlace, visualDetail, detailPlacePhotos) : null;
  const detailNavigationItems = useMemo(
    () =>
      detailPlace && visualDetail?.kind === "photo"
        ? getPlaceGalleryItems(detailPlace, detailPlacePhotos).filter((item) => item.kind === "photo")
        : [],
    [detailPlace, detailPlacePhotos, visualDetail?.kind],
  );
  const reportPlace = reportTarget ? (places.find((place) => place.id === reportTarget.placeId) ?? null) : null;
  const reportPlacePhotos = reportPlace?.id === expandedPlace?.id ? expandedPlacePhotos : null;
  const reportItem =
    reportPlace && reportTarget ? findPlaceGalleryItem(reportPlace, reportTarget, reportPlacePhotos) : null;

  useMapEvents({
    moveend: refreshMapViewport,
    resize: refreshMapViewport,
    zoomend: refreshMapViewport,
  });

  useEffect(() => {
    refreshMapViewport();
  }, [placesMotionSignature, refreshMapViewport]);

  useEffect(() => {
    previousPlacesMotionSignature.current = placesMotionSignature;
  }, [placesMotionSignature]);

  useEffect(() => {
    if (memoryPlace && !places.some((place) => place.id === memoryPlace.id)) {
      setMemoryPlace(null);
    }
    if (visualDetail && !places.some((place) => place.id === visualDetail.placeId)) {
      setVisualDetail(null);
    }
    if (reportTarget && !places.some((place) => place.id === reportTarget.placeId)) {
      setReportTarget(null);
    }
  }, [memoryPlace, places, reportTarget, visualDetail]);

  return (
    <>
      <MapCloseEvents
        onClose={() => {
          closePlaceGallery();
          setMemoryPlace(null);
        }}
      />
      <MapInteractionLock isLocked={isGalleryInteractionLocked} />
      <MapPhotoGalleryPane />
      <MapPhotoGalleryGlass place={expandedPlace} onClose={closePlaceGallery} />
      {markerPlaces.map((place, index) => (
        <PlaceMarker
          key={`${placesMotionSignature}:${place.id}`}
          place={place}
          galleryItems={galleryItemsByPlaceId.get(place.id) ?? EMPTY_PLACE_GALLERY_ITEMS}
          isExpanded={expandedPlaceId === place.id}
          enterIndex={index}
          isEntering={shouldAnimateMarkers}
          onMemoryOpen={setMemoryPlace}
          onMediaOpen={(nextPlace, nextItem) => {
            setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: nextPlace.id });
          }}
          onToggleGallery={() => togglePlaceGallery(place)}
          displayOffset={markerDisplayOffsets.get(place.id)}
          markerScale={mapSettings.marker_scale}
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
          customFieldDefinitions={placeCustomFieldDefinitions}
          isAudioAutoplayEnabled={isAudioAutoplayEnabled}
          item={detailItem}
          navigationItems={detailNavigationItems}
          place={detailPlace}
          onPin={(pinRequest) => {
            const didPin = onPinMedia({ item: detailItem, place: detailPlace, ...pinRequest });
            if (didPin) {
              setVisualDetail(null);
            }

            return didPin;
          }}
          onNavigate={(nextItem) => {
            setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: detailPlace.id });
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
  isAudioAutoplayEnabled,
  mapFallback,
  markerPlaces,
  onPinnedMediaVisibleChange,
  pinnedMediaPlaces,
  placeCustomFieldDefinitions,
  showPinnedMedia,
}: Props) {
  const center: [number, number] = [mapFallback.fallback_center.lat, mapFallback.fallback_center.lon];
  const mapStartKey = `${mapFallback.fallback_center.lat}:${mapFallback.fallback_center.lon}:${mapFallback.fallback_zoom}`;
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
        zoom={mapFallback.fallback_zoom}
        className="place-map"
        key={mapStartKey}
        scrollWheelZoom={MAP_DISPLAY_CONFIG.mapContainer.scrollWheelZoom}
        zoomDelta={MAP_DISPLAY_CONFIG.mapContainer.zoomDelta}
        zoomControl={MAP_DISPLAY_CONFIG.mapContainer.zoomControl}
        zoomSnap={MAP_DISPLAY_CONFIG.mapContainer.zoomSnap}
      >
        <MapSizeUpdater />
        <MapProjectionTracker onProjectorChange={handleProjectorChange} />
        <DistanceMeasureTool />
        <ZoomControl position={MAP_DISPLAY_CONFIG.mapControls.zoomControlPosition} />
        <TileLayer attribution={MAP_DISPLAY_CONFIG.tileLayer.attribution} url={MAP_DISPLAY_CONFIG.tileLayer.url} />
        <PlaceLayer
          isAudioAutoplayEnabled={isAudioAutoplayEnabled}
          mapSettings={mapFallback}
          places={markerPlaces}
          placeCustomFieldDefinitions={placeCustomFieldDefinitions}
          onPinMedia={handlePinMedia}
        />
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
