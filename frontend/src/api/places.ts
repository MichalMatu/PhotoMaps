import { request } from "./http";
import type { Place, PlaceMapItem, PlacePayload } from "./types";

export function getMapPlaces(): Promise<PlaceMapItem[]> {
  return request<PlaceMapItem[]>("/api/places/map");
}

export function getAdminPlaces(): Promise<Place[]> {
  return request<Place[]>("/api/admin/places");
}

export function createPlace(payload: PlacePayload): Promise<Place> {
  return request<Place>("/api/admin/places", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePlace(placeId: string, payload: PlacePayload): Promise<Place> {
  return request<Place>(`/api/admin/places/${placeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archivePlace(placeId: string): Promise<Place> {
  return request<Place>(`/api/admin/places/${placeId}`, {
    method: "DELETE",
  });
}
