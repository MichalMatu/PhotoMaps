import { getPlacePhotos } from "../../api/media";

export const PLACE_GALLERY_STALE_TIME_MS = 60_000;

export function placeGalleryQueryOptions(placeId: string) {
  return {
    queryKey: ["place", placeId, "photos"] as const,
    queryFn: () => getPlacePhotos(placeId),
    staleTime: PLACE_GALLERY_STALE_TIME_MS,
  };
}
