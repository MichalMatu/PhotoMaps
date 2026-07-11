import { request } from "./http";
import type { AdminPlace, City, PlaceDetail, PlaceMapItem, PlacePayload, PlaceUpdatePayload } from "./types";

export function getPlace(idOrSlug: string): Promise<PlaceDetail> {
  return request<PlaceDetail>(`/api/places/${encodeURIComponent(idOrSlug)}`);
}

export function getMapPlaces(cityId?: string | null): Promise<PlaceMapItem[]> {
  const query = cityId ? `?city_id=${encodeURIComponent(cityId)}` : "";
  return request<PlaceMapItem[]>(`/api/places/map${query}`);
}

export async function getAdminMapPlacesForCities(cities: City[]): Promise<PlaceMapItem[]> {
  const activeCityIds = new Set(cities.filter((city) => city.status === "active").map((city) => city.id));
  if (activeCityIds.size === 0) {
    return [];
  }

  const places = await getMapPlaces();
  return places.filter((place) => activeCityIds.has(place.city_id));
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
