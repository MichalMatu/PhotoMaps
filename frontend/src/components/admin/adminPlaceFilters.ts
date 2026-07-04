import type { AdminPlace } from "../../api/types";
import { getPlaceCompleteness } from "./placeCompleteness";

export type AdminPlaceCompletenessFilter =
  | "all"
  | "missing-article"
  | "missing-cover"
  | "missing-media"
  | "missing-text"
  | "ready";

export type AdminPlaceFilters = {
  categoryId: string;
  cityId: string;
  completeness: AdminPlaceCompletenessFilter;
  query: string;
  status: AdminPlace["status"] | "all";
};

export const DEFAULT_ADMIN_PLACE_FILTERS: AdminPlaceFilters = {
  categoryId: "all",
  cityId: "all",
  completeness: "all",
  query: "",
  status: "all",
};

function matchesQuery(place: AdminPlace, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("pl");
  if (!normalizedQuery) {
    return true;
  }

  return [place.title, place.slug, place.description, place.local_comment]
    .filter(Boolean)
    .some((value) => value?.toLocaleLowerCase("pl").includes(normalizedQuery));
}

function matchesCompleteness(place: AdminPlace, completeness: AdminPlaceCompletenessFilter) {
  if (completeness === "all") {
    return true;
  }

  const placeCompleteness = getPlaceCompleteness(place);
  if (completeness === "ready") {
    return placeCompleteness.isReady;
  }

  const missingLabels = new Set(placeCompleteness.missingLabels);
  if (completeness === "missing-cover") return missingLabels.has("cover");
  if (completeness === "missing-media") return missingLabels.has("media");
  if (completeness === "missing-text") return missingLabels.has("opis");
  return missingLabels.has("pełny opis");
}

export function filterAdminPlaces(places: AdminPlace[], filters: AdminPlaceFilters): AdminPlace[] {
  return places.filter((place) => {
    if (filters.cityId !== "all" && place.city_id !== filters.cityId) return false;
    if (filters.status !== "all" && place.status !== filters.status) return false;
    if (filters.categoryId !== "all" && !place.category_ids.includes(filters.categoryId)) return false;
    if (!matchesCompleteness(place, filters.completeness)) return false;
    return matchesQuery(place, filters.query);
  });
}

export function countActiveAdminPlaceFilters(filters: AdminPlaceFilters): number {
  return [
    filters.query.trim() ? "query" : null,
    filters.cityId !== "all" ? "city" : null,
    filters.status !== "all" ? "status" : null,
    filters.categoryId !== "all" ? "category" : null,
    filters.completeness !== "all" ? "completeness" : null,
  ].filter(Boolean).length;
}

export function countActiveAdminPlaceModalFilters(filters: AdminPlaceFilters): number {
  return [
    filters.query.trim() ? "query" : null,
    filters.cityId !== "all" ? "city" : null,
    filters.categoryId !== "all" ? "category" : null,
    filters.completeness !== "all" ? "completeness" : null,
  ].filter(Boolean).length;
}
