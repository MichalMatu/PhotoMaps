import type { Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import type { AppConfigMap, PlaceCustomFieldDefinition, PlaceMapItem } from "../../api/types";
import { SystemModal } from "../ui/SystemModal";
import { MemorySheet } from "./MemorySheet";
import { MapCloseEvents } from "./MapCloseEvents";
import { MapInteractionLock } from "./mapInteractionLock";
import { MapPhotoGalleryGlass } from "./MapPhotoGalleryGlass";
import { MapPhotoGalleryPane } from "./MapPhotoGalleryPane";
import { PhotoDetailModal } from "./PhotoDetailModal";
import { PlaceMarker } from "./PlaceMarker";
import type { PlaceMapVisualItem } from "./placePreview";
import { ReportSheet } from "./ReportSheet";
import { useCenteredPlaceGallery } from "./useCenteredPlaceGallery";
import { type MapViewport, useMapMarkerLayout } from "./useMapMarkerLayout";
import { type PlaceVisualTarget, usePlaceGalleryData } from "./usePlaceGalleryData";
import type { PinMediaRequest } from "./usePinnedMediaBoard";

type PlaceLayerProps = {
  isAudioAutoplayEnabled: boolean;
  mapSettings: AppConfigMap;
  onPinMedia: (request: PinMediaRequest) => boolean;
  places: PlaceMapItem[];
  placeCustomFieldDefinitions: PlaceCustomFieldDefinition[];
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

export function PlaceLayer({
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
  const [visualDetail, setVisualDetail] = useState<PlaceVisualTarget | null>(null);
  const [reportTarget, setReportTarget] = useState<PlaceVisualTarget | null>(null);
  const [isThanksOpen, setIsThanksOpen] = useState(false);
  const zoom = mapViewport.zoom;
  const { markerDisplayOffsets, markerPlaces } = useMapMarkerLayout({
    map,
    mapSettings,
    mapViewport,
    places,
  });
  const { closePlaceGallery, expandedPlace, expandedPlaceId, isGalleryInteractionLocked, togglePlaceGallery } =
    useCenteredPlaceGallery(map, places);
  const {
    detailItem,
    detailNavigationItems,
    detailPlace,
    galleryItemsByPlaceId,
    renderedMarkerPlaces,
    reportItem,
    reportPlace,
  } = usePlaceGalleryData({
    expandedPlace,
    expandedPlaceId,
    markerPlaces,
    places,
    reportTarget,
    visualDetail,
  });

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
      {renderedMarkerPlaces.map((place, index) => (
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
