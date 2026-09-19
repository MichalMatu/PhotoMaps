import type { Map as LeafletMap } from "leaflet";
import { useMemo } from "react";

import type { AppConfigMap, PlaceMapItem } from "../../api/types";
import { resolveMapMarkerCollisions } from "./mapMarkerCollision";
import { getMapPlacePriority, limitMapMarkersByDensity } from "./mapMarkerDensity";
import type { MarkerDisplayOffset } from "./mapMarkerDisplayOffset";
import { limitMapMarkersByResolvedDensity } from "./mapMarkerSelection";
import { getPlaceMarkerLayout } from "./mapMarkerScale";
import { filterMapMarkersByViewport } from "./mapMarkerViewport";

export type MapViewport = {
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

type UseMapMarkerLayoutParams = {
  map: LeafletMap;
  mapSettings: AppConfigMap;
  mapViewport: MapViewport;
  places: PlaceMapItem[];
};

export function useMapMarkerLayout({ map, mapSettings, mapViewport, places }: UseMapMarkerLayoutParams) {
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

  return { markerDisplayOffsets, markerPlaces };
}
