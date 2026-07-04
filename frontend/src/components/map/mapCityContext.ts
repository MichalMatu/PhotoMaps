import type { AppConfigMap, City, PlaceMapItem } from "../../api/types";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

export const POLAND_EMPTY_MAP_FALLBACK: AppConfigMap = MAP_DISPLAY_CONFIG.fallback.emptyCountryMap;

export function selectDefaultMapCity(cities: City[]): City | null {
  return cities[0] ?? null;
}

export function filterMapPlacesByCity(places: PlaceMapItem[], city: City | null): PlaceMapItem[] {
  if (!city) {
    return [];
  }

  return places.filter((place) => place.city_id === city.id);
}

export function mapCityForPlaceContent(city: City | null, cityPlaces: PlaceMapItem[]): City | null {
  return cityPlaces.length > 0 ? city : null;
}

export function mapFallbackForPlaceContent(mapFallback: AppConfigMap, cityPlaces: PlaceMapItem[]): AppConfigMap {
  return cityPlaces.length > 0 ? mapFallback : POLAND_EMPTY_MAP_FALLBACK;
}
