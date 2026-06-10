import type { Photo, PlaceMapItem } from "../../api/client";

export function getPlacePreviewPhoto(place: Pick<PlaceMapItem, "cover_photo" | "photos">): Photo | null {
  return place.cover_photo ?? place.photos[0] ?? null;
}
