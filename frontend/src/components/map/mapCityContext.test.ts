import { describe, expect, it } from "vitest";

import type { AppConfigMap, City, PlaceMapItem } from "../../api/types";
import {
  filterMapPlacesByCity,
  mapCityForPlaceContent,
  mapFallbackForPlaceContent,
  POLAND_EMPTY_MAP_FALLBACK,
  selectDefaultMapCity,
} from "./mapCityContext";

function city(id: string, sortOrder = 0): City {
  return {
    default_zoom: 13,
    id,
    lat: 51.1,
    lon: 17.1,
    name: id,
    sort_order: sortOrder,
    status: "active",
  };
}

function place(id: string, cityId: string): PlaceMapItem {
  return {
    categories: [],
    category_ids: [],
    city: city(cityId),
    city_id: cityId,
    cover_photo: null,
    description: null,
    id,
    lat: 51.1,
    lon: 17.1,
    memory_count: 0,
    photo_count: 0,
    preview_items: [],
    score: 1,
    slug: id,
    custom_fields: {},
    title: id,
    weight: 1,
  };
}

describe("map city context", () => {
  it("uses the first public city as the explicit default map city", () => {
    const wroclaw = city("wroclaw", 0);
    const krakow = city("krakow", 1);

    expect(selectDefaultMapCity([wroclaw, krakow])).toBe(wroclaw);
    expect(selectDefaultMapCity([])).toBeNull();
  });

  it("filters map places to the selected city without deriving city from the first place", () => {
    const selectedCity = city("wroclaw");
    const places = [place("krakow-place", "krakow"), place("wroclaw-place", "wroclaw")];

    expect(filterMapPlacesByCity(places, selectedCity).map((item) => item.id)).toEqual(["wroclaw-place"]);
    expect(filterMapPlacesByCity(places, null)).toEqual([]);
  });

  it("uses a Poland fallback when a city has no visible place content", () => {
    const selectedCity = city("wroclaw");
    const configuredFallback: AppConfigMap = {
      fallback_center: { lat: 51.1079, lon: 17.0385 },
      fallback_zoom: 13,
    };
    const places = [place("wroclaw-place", "wroclaw")];

    expect(mapCityForPlaceContent(selectedCity, [])).toBeNull();
    expect(mapFallbackForPlaceContent(configuredFallback, [])).toEqual(POLAND_EMPTY_MAP_FALLBACK);
    expect(mapCityForPlaceContent(selectedCity, places)).toBe(selectedCity);
    expect(mapFallbackForPlaceContent(configuredFallback, places)).toBe(configuredFallback);
  });
});
