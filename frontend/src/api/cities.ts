import { request } from "./http";
import type { City, CityPayload, CityUpdatePayload } from "./types";

export function getAdminCities(): Promise<City[]> {
  return request<City[]>("/api/admin/cities");
}

export function createCity(payload: CityPayload): Promise<City> {
  return request<City>("/api/admin/cities", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCity(cityId: string, payload: CityUpdatePayload): Promise<City> {
  return request<City>(`/api/admin/cities/${cityId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveCity(cityId: string): Promise<City> {
  return request<City>(`/api/admin/cities/${cityId}`, {
    method: "DELETE",
  });
}

export function deleteCityPermanently(cityId: string): Promise<void> {
  return request<void>(`/api/admin/cities/${cityId}?force=true`, {
    method: "DELETE",
  });
}
