import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PlaceMapItem } from "../../api/types";
import {
  isWithinPlaceCenterTolerance,
  MAP_PLACE_CENTER_FALLBACK_MS,
  MAP_PLACE_CENTER_PAN_OPTIONS,
  MAP_PLACE_CENTER_SNAP_OPTIONS,
  placeCenterLatLng,
} from "./mapPlaceCenter";

function findPlaceById(places: PlaceMapItem[], placeId: string | null): PlaceMapItem | null {
  if (!placeId) {
    return null;
  }

  return places.find((place) => place.id === placeId) ?? null;
}

function isLatLngCenteredOnMap(map: LeafletMap, target: LatLngExpression): boolean {
  const centerPoint = map.getSize().divideBy(2);
  const targetPoint = map.latLngToContainerPoint(target);

  return isWithinPlaceCenterTolerance(targetPoint.distanceTo(centerPoint));
}

export function useCenteredPlaceGallery(map: LeafletMap, markerPlaces: PlaceMapItem[]) {
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [pendingPlaceId, setPendingPlaceId] = useState<string | null>(null);
  const expandedPlace = useMemo(() => findPlaceById(markerPlaces, expandedPlaceId), [expandedPlaceId, markerPlaces]);
  const pendingPlace = useMemo(() => findPlaceById(markerPlaces, pendingPlaceId), [markerPlaces, pendingPlaceId]);
  const pendingTargetId = pendingPlace?.id ?? null;
  const pendingTargetLat = pendingPlace?.lat ?? null;
  const pendingTargetLon = pendingPlace?.lon ?? null;

  const closePlaceGallery = useCallback(() => {
    setPendingPlaceId(null);
    setExpandedPlaceId(null);
  }, []);

  const togglePlaceGallery = useCallback(
    (place: PlaceMapItem) => {
      if (expandedPlaceId === place.id || pendingPlaceId === place.id) {
        closePlaceGallery();
        return;
      }

      setExpandedPlaceId(null);
      setPendingPlaceId(place.id);
    },
    [closePlaceGallery, expandedPlaceId, pendingPlaceId],
  );

  useEffect(() => {
    if (expandedPlaceId && !expandedPlace) {
      setExpandedPlaceId(null);
    }

    if (pendingPlaceId && !pendingPlace) {
      setPendingPlaceId(null);
    }
  }, [expandedPlace, expandedPlaceId, pendingPlace, pendingPlaceId]);

  useEffect(() => {
    if (!pendingTargetId || pendingTargetLat === null || pendingTargetLon === null) {
      return undefined;
    }

    const target = placeCenterLatLng({ lat: pendingTargetLat, lon: pendingTargetLon });

    if (isLatLngCenteredOnMap(map, target)) {
      setExpandedPlaceId(pendingTargetId);
      setPendingPlaceId(null);
      return undefined;
    }

    let isFinished = false;
    let fallbackTimeoutId: number | null = null;
    let finishFrameId: number | null = null;

    const openPlaceGallery = () => {
      if (isFinished) {
        return;
      }

      isFinished = true;
      map.off("moveend", openWhenCentered);
      if (fallbackTimeoutId !== null) {
        window.clearTimeout(fallbackTimeoutId);
      }
      if (finishFrameId !== null) {
        window.cancelAnimationFrame(finishFrameId);
      }
      setExpandedPlaceId(pendingTargetId);
      setPendingPlaceId(null);
    };

    const openWhenCentered = () => {
      if (isLatLngCenteredOnMap(map, target)) {
        openPlaceGallery();
      }
    };

    const finishWithCenteredFallback = () => {
      if (!isLatLngCenteredOnMap(map, target)) {
        map.panTo(target, MAP_PLACE_CENTER_SNAP_OPTIONS);
        finishFrameId = window.requestAnimationFrame(openPlaceGallery);
        return;
      }

      openPlaceGallery();
    };

    map.on("moveend", openWhenCentered);
    map.panTo(target, MAP_PLACE_CENTER_PAN_OPTIONS);
    fallbackTimeoutId = window.setTimeout(finishWithCenteredFallback, MAP_PLACE_CENTER_FALLBACK_MS);

    return () => {
      isFinished = true;
      map.off("moveend", openWhenCentered);
      if (fallbackTimeoutId !== null) {
        window.clearTimeout(fallbackTimeoutId);
      }
      if (finishFrameId !== null) {
        window.cancelAnimationFrame(finishFrameId);
      }
    };
  }, [map, pendingTargetId, pendingTargetLat, pendingTargetLon]);

  return {
    closePlaceGallery,
    expandedPlace,
    expandedPlaceId,
    isGalleryInteractionLocked: expandedPlaceId !== null || pendingPlaceId !== null,
    togglePlaceGallery,
  };
}
