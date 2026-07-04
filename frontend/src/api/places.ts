import { request } from "./http";
import type { AdminPlace, City, PlaceDetail, PlaceMapItem, PlacePayload, PlaceUpdatePayload } from "./types";

export function getPlace(idOrSlug: string): Promise<PlaceDetail> {
  return request<PlaceDetail>(`/api/places/${encodeURIComponent(idOrSlug)}`);
}

export function getMapPlaces(cityId: string): Promise<PlaceMapItem[]> {
  return request<PlaceMapItem[]>(`/api/places/map?city_id=${encodeURIComponent(cityId)}`);
}

export async function getMapPlacesForCities(cities: City[]): Promise<PlaceMapItem[]> {
  const activeCities = cities.filter((city) => city.status === "active");
  const cityResults = await Promise.all(activeCities.map((city) => getMapPlaces(city.id)));
  return cityResults.flat();
}

export function getAdminPlaces(): Promise<AdminPlace[]> {
  return request<AdminPlace[]>("/api/admin/places");
}

export function createPlace(payload: PlacePayload): Promise<AdminPlace> {
  return request<AdminPlace>("/api/admin/places", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePlace(placeId: string, payload: PlaceUpdatePayload): Promise<AdminPlace> {
  return request<AdminPlace>(`/api/admin/places/${placeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updatePlaceCover(placeId: string, coverPhotoId: string | null): Promise<AdminPlace> {
  return request<AdminPlace>(`/api/admin/places/${placeId}`, {
    method: "PATCH",
    body: JSON.stringify({ cover_photo_id: coverPhotoId }),
  });
}

export function archivePlace(placeId: string): Promise<AdminPlace> {
  return request<AdminPlace>(`/api/admin/places/${placeId}`, {
    method: "DELETE",
  });
}

export function deletePlacePermanently(placeId: string): Promise<void> {
  return request<void>(`/api/admin/places/${placeId}?force=true`, {
    method: "DELETE",
  });
}
