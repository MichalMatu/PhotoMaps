import { afterEach, describe, expect, it, vi } from "vitest";

import { getAdminMapPlacesForCities, getMapPlaces } from "./places";
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
    region: "Dolnośląskie",
    sort_order: 1,
    status,
  };
}

describe("places API", () => {
  it("requests all map places when city filter is disabled", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" }, status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMapPlaces();

    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/places/map");
  });

  it("requests map places for an explicit city", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" }, status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await getMapPlaces("wroclaw");

    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/places/map?city_id=wroclaw");
  });

  it("loads admin map preview places with one all-active-cities request", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify([{ city_id: "wroclaw" }, { city_id: "archived-city" }, { city_id: "unknown-active-city" }]),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const places = await getAdminMapPlacesForCities([city("wroclaw"), city("archived-city", "archived")]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/places/map");
    expect(places).toEqual([{ city_id: "wroclaw" }]);
  });

  it("skips admin map preview loading when no city is active", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" }, status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const places = await getAdminMapPlacesForCities([city("archived-city", "archived")]);

    expect(places).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
