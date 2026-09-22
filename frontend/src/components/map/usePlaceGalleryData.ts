import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { PlaceMapItem } from "../../api/types";
import { placeGalleryQueryOptions } from "./placeGalleryQuery";
import { findPlaceGalleryItem, getPlaceGalleryItems, type PlaceMapVisualItem } from "./placePreview";

export type PlaceVisualTarget = {
  id: string;
  kind: PlaceMapVisualItem["kind"];
  placeId: string;
};

type UsePlaceGalleryDataParams = {
  expandedPlace: PlaceMapItem | null;
  expandedPlaceId: string | null;
  markerPlaces: PlaceMapItem[];
  places: PlaceMapItem[];
  reportTarget: PlaceVisualTarget | null;
  visualDetail: PlaceVisualTarget | null;
};

export function usePlaceGalleryData({
  expandedPlace,
  expandedPlaceId,
  markerPlaces,
  places,
  reportTarget,
  visualDetail,
}: UsePlaceGalleryDataParams) {
  const renderedMarkerPlaces = useMemo(() => {
    if (!expandedPlace || markerPlaces.some((place) => place.id === expandedPlace.id)) {
      return markerPlaces;
    }

    return [...markerPlaces, expandedPlace];
  }, [expandedPlace, markerPlaces]);
  const expandedPlacePhotosQuery = useQuery({
    ...placeGalleryQueryOptions(expandedPlace?.id ?? ""),
    enabled: expandedPlace !== null,
  });
  const expandedPlacePhotos = expandedPlacePhotosQuery.data ?? null;
  const galleryItemsByPlaceId = useMemo(() => {
    return new Map(
      renderedMarkerPlaces.map((place) => [
        place.id,
        getPlaceGalleryItems(place, expandedPlaceId === place.id ? expandedPlacePhotos : null),
      ]),
    );
  }, [expandedPlaceId, expandedPlacePhotos, renderedMarkerPlaces]);
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

  return {
    detailItem,
    detailNavigationItems,
    detailPlace,
    galleryItemsByPlaceId,
    renderedMarkerPlaces,
    reportItem,
    reportPlace,
  };
}
