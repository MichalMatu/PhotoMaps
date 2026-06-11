import { request } from "./http";
import type { City } from "./types";

export function getAdminCities(): Promise<City[]> {
  return request<City[]>("/api/admin/cities");
}
