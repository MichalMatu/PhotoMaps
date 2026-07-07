import { describe, expect, it } from "vitest";

import type { City, PlaceMapItem } from "../../api/types";
import { getMapMarkerDensityLimit, getMapPlacePriority, limitMapMarkersByDensity } from "./mapMarkerDensity";

function city(id: string, sortOrder = 10): City {
  return {
    default_zoom: 13,
    id,
    lat: 51.1,
    lon: 17.03,
    name: id,
    region: "Dolnośląskie",
    sort_order: sortOrder,
    status: "active",
  };
}

function place(index: number, overrides: Partial<PlaceMapItem> = {}): PlaceMapItem {
  const placeCity = overrides.city ?? city(overrides.city_id ?? "wroclaw");

  return {
    categories: [],
    category_ids: [],
    city: placeCity,
    city_id: placeCity.id,
    cover_photo: null,
    custom_fields: {},
    description: null,
    id: `place-${index}`,
    lat: 51.1 + index * 0.001,
    lon: 17.03 + index * 0.001,
    memory_count: 0,
    photo_count: 1,
    preview_items: [],
    score: 1,
    slug: `place-${index}`,
    title: `Place ${index}`,
    weight: 1,
    ...overrides,
  };
}

describe("limitMapMarkersByDensity", () => {
  it("keeps all markers when the current zoom can show the whole set", () => {
    const places = Array.from({ length: 24 }, (_, index) => place(index));

    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 16 })).toHaveLength(24);
  });

  it("collapses one city to its strongest editorial representative at regional zoom", () => {
    const places = Array.from({ length: 40 }, (_, index) =>
      place(index, {
        score: index === 22 ? 90 : 1,
        weight: index === 14 ? 5 : 1,
      }),
    );

    const visiblePlaces = limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 6 });

    expect(visiblePlaces).toHaveLength(1);
    expect(visiblePlaces.map((item) => item.id)).toContain("place-14");
  });

  it("scales the regional city representative budget with monitor size at the same zoom", () => {
    const places = Array.from({ length: 49 }, (_, index) =>
      place(index, {
        city: city(`city-${index}`, index),
      }),
    );

    const standardLimit = getMapMarkerDensityLimit(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 6 });
    const wideLimit = getMapMarkerDensityLimit(places, { viewportHeight: 1440, viewportWidth: 2560, zoom: 6 });
    const mobileLimit = getMapMarkerDensityLimit(places, { viewportHeight: 844, viewportWidth: 390, zoom: 6 });

    expect(mobileLimit).toBeLessThan(standardLimit);
    expect(standardLimit).toBeLessThan(wideLimit);
    expect(wideLimit).toBeGreaterThanOrEqual(40);
  });

  it("keeps regional zoom to one tile per city even when the wide viewport could fit more", () => {
    const places = [
      ...Array.from({ length: 38 }, (_, index) =>
        place(index, {
          city: city("wroclaw", 10),
          score: index === 30 ? 30 : 1,
          weight: index === 10 ? 8 : 1,
        }),
      ),
      ...Array.from({ length: 10 }, (_, index) =>
        place(100 + index, { city: city(`city-${index}`, 20 + index), score: 1, weight: 1 }),
      ),
    ];

    const visiblePlaces = limitMapMarkersByDensity(places, { viewportHeight: 1440, viewportWidth: 2560, zoom: 10 });
    const wroclawPlaces = visiblePlaces.filter((item) => item.city_id === "wroclaw");

    expect(visiblePlaces).toHaveLength(11);
    expect(wroclawPlaces).toHaveLength(1);
    expect(wroclawPlaces[0].id).toBe("place-10");
  });

  it("adds same-city detail through the city zoom ramp after city representatives", () => {
    const walbrzych = city("walbrzych", 10);
    const places = [
      place(1, { city: walbrzych, score: 50, title: "Zamek Książ", weight: 5 }),
      place(2, { city: walbrzych, score: 22.5, title: "Stara Kopalnia w Wałbrzychu", weight: 4.5 }),
      place(3, { city: city("swidnica", 20), score: 1, weight: 1 }),
      place(4, { city: city("jedlina", 30), score: 1, weight: 1 }),
      place(5, { city: city("gluszyca", 40), score: 1, weight: 1 }),
      place(6, { city: city("bolkow", 50), score: 1, weight: 1 }),
    ];

    const visiblePlaces = limitMapMarkersByDensity(places, { viewportHeight: 1024, viewportWidth: 2048, zoom: 12.5 });

    expect(visiblePlaces).toHaveLength(6);
    expect(visiblePlaces.map((item) => item.title)).toEqual([
      "Zamek Książ",
      "Stara Kopalnia w Wałbrzychu",
      "Place 3",
      "Place 4",
      "Place 5",
      "Place 6",
    ]);
  });

  it("does not fill unused regional budget from one city before the city detail ramp", () => {
    const places = Array.from({ length: 40 }, (_, index) => place(index));

    expect(limitMapMarkersByDensity(places, { viewportHeight: 1024, viewportWidth: 2048, zoom: 11 })).toHaveLength(1);
  });

  it("keeps the whole city set when it fits the density budget at city detail zoom", () => {
    const places = Array.from({ length: 2 }, (_, index) => place(index));

    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 13 })).toHaveLength(2);
  });

  it("keeps one-city detail gradual at the default city zoom", () => {
    const places = Array.from({ length: 40 }, (_, index) => place(index));

    const visiblePlaces = limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 13 });

    expect(visiblePlaces).toHaveLength(16);
    expect(visiblePlaces.length).toBeLessThan(places.length);
  });

  it("opens city detail gradually after the regional zoom range", () => {
    const places = Array.from({ length: 40 }, (_, index) =>
      place(index, {
        score: index === 30 ? 30 : 1,
        weight: index === 10 ? 8 : 1,
      }),
    );

    const visiblePlaces = limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 12.5 });

    expect(visiblePlaces).toHaveLength(10);
    expect(visiblePlaces.map((item) => item.id)).toContain("place-30");
    expect(visiblePlaces.map((item) => item.id)).toContain("place-10");
    expect(visiblePlaces.map((item) => item.id)).toEqual(
      visiblePlaces
        .map((item) => item.id)
        .sort((left, right) => {
          const leftIndex = Number(left.replace("place-", ""));
          const rightIndex = Number(right.replace("place-", ""));
          return leftIndex - rightIndex;
        }),
    );
  });

  it("adds city detail smoothly through several zoom layers before showing the full city set", () => {
    const places = Array.from({ length: 40 }, (_, index) => place(index));

    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 11.5 })).toHaveLength(1);
    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 12 })).toHaveLength(5);
    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 12.5 })).toHaveLength(10);
    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 12.75 })).toHaveLength(
      13,
    );
    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 13 })).toHaveLength(16);
    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 13.5 })).toHaveLength(22);
    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 14 })).toHaveLength(28);
    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 14.5 })).toHaveLength(34);
    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 15 })).toHaveLength(40);
  });

  it("does not jump from sparse to full one-city detail around zoom 13", () => {
    const places = Array.from({ length: 40 }, (_, index) => place(index));
    const beforeThresholdCount = limitMapMarkersByDensity(places, {
      viewportHeight: 820,
      viewportWidth: 1280,
      zoom: 12.75,
    }).length;
    const afterThresholdCount = limitMapMarkersByDensity(places, {
      viewportHeight: 820,
      viewportWidth: 1280,
      zoom: 13,
    }).length;

    expect(afterThresholdCount - beforeThresholdCount).toBeLessThanOrEqual(4);
    expect(afterThresholdCount).toBeLessThan(places.length);
  });

  it("reduces marker density on small viewports before collision layout runs", () => {
    const places = Array.from({ length: 40 }, (_, index) => place(index));

    expect(limitMapMarkersByDensity(places, { viewportHeight: 780, viewportWidth: 390, zoom: 13 })).toHaveLength(5);
  });

  it("uses runtime density settings to show fewer or more visible marker tiles", () => {
    const places = Array.from({ length: 60 }, (_, index) => place(index, { city: city(`city-${index}`, index) }));
    const denseLimit = getMapMarkerDensityLimit(places, {
      markerDensity: {
        full_density_zoom: 15,
        marker_viewport_area: 12_000,
        max_zoom_fill_ratio: 1,
        min_zoom: 6,
        min_zoom_fill_ratio: 0.2,
        zoom_curve: 1.1,
      },
      viewportHeight: 820,
      viewportWidth: 1280,
      zoom: 13,
    });
    const sparseLimit = getMapMarkerDensityLimit(places, {
      markerDensity: {
        full_density_zoom: 15,
        marker_viewport_area: 48_000,
        max_zoom_fill_ratio: 0.7,
        min_zoom: 6,
        min_zoom_fill_ratio: 0.08,
        zoom_curve: 1.8,
      },
      viewportHeight: 820,
      viewportWidth: 1280,
      zoom: 13,
    });

    expect(denseLimit).toBeGreaterThan(sparseLimit);
  });

  it("shows the full city set on desktop when zoomed into a city", () => {
    const places = Array.from({ length: 40 }, (_, index) => place(index));

    expect(limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 15.5 })).toHaveLength(40);
  });

  it("gives each city one representative instead of filling a regional view with one city", () => {
    const places = [
      ...Array.from({ length: 38 }, (_, index) => place(index, { city: city("wroclaw", 10), weight: 5 })),
      ...Array.from({ length: 10 }, (_, index) =>
        place(100 + index, { city: city(`city-${index}`, 20 + index), score: 1, weight: 1 }),
      ),
    ];

    const visiblePlaces = limitMapMarkersByDensity(places, { viewportHeight: 820, viewportWidth: 1280, zoom: 6 });
    const visibleCityIds = new Set(visiblePlaces.map((item) => item.city_id));

    expect(visiblePlaces).toHaveLength(11);
    expect(visibleCityIds).toEqual(new Set(["wroclaw", ...Array.from({ length: 10 }, (_, index) => `city-${index}`)]));
  });

  it("lets editorial weight decide which marker survives when scores are close", () => {
    const lowerWeightPlace = place(1, { photo_count: 8, score: 40, weight: 1 });
    const higherWeightPlace = place(2, { photo_count: 1, score: 16, weight: 5 });

    expect(getMapPlacePriority(higherWeightPlace)).toBeGreaterThan(getMapPlacePriority(lowerWeightPlace));
  });

  it("uses runtime ranking weights when editorial and score priorities need different tuning", () => {
    const editorialPlace = place(1, { score: 5, weight: 5 });
    const scorePlace = place(2, { score: 80, weight: 1 });

    expect(getMapPlacePriority(editorialPlace)).toBeGreaterThan(getMapPlacePriority(scorePlace));
    expect(
      getMapPlacePriority(scorePlace, {
        editorial_weight_multiplier: 1,
        memory_count_multiplier: 0,
        photo_count_sqrt_multiplier: 0,
        score_multiplier: 2,
      }),
    ).toBeGreaterThan(
      getMapPlacePriority(editorialPlace, {
        editorial_weight_multiplier: 1,
        memory_count_multiplier: 0,
        photo_count_sqrt_multiplier: 0,
        score_multiplier: 2,
      }),
    );
  });
});
