import { afterEach, describe, expect, it, vi } from "vitest";

import { getMapPlaces, getMapPlacesForCities } from "./places";
import type { City } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

function city(id: string, status: City["status"] = "active"): City {
  return {
    default_zoom: 13,
    id,
    lat: 51.1,
    lon: 17.1,
    name: id,
    sort_order: 1,
    status,
  };
}

describe("places API", () => {
  it("requests map places for an explicit city", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" }, status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMapPlaces("wroclaw");

    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/places/map?city_id=wroclaw");
  });

  it("loads map places only for active cities", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" }, status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMapPlacesForCities([city("wroclaw"), city("archived-city", "archived")]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/places/map?city_id=wroclaw");
  });
});
