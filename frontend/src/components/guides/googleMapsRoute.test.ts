import { describe, expect, it } from "vitest";

import type { PublicGuidePlacePreview } from "../../api/types";
import { buildGoogleMapsWalkingRouteUrl } from "./googleMapsRoute";

function place(id: string, lat: number, lon: number): PublicGuidePlacePreview {
  return {
    city_id: "wroclaw",
    cover_photo: null,
    description: null,
    id,
    lat,
    lon,
    memory_count: 0,
    photo_count: 0,
    slug: id,
    title: id,
  };
}

describe("buildGoogleMapsWalkingRouteUrl", () => {
  it("returns null when a route has fewer than two points", () => {
    expect(buildGoogleMapsWalkingRouteUrl([])).toBeNull();
    expect(buildGoogleMapsWalkingRouteUrl([place("start", 51.1097, 17.0325)])).toBeNull();
  });

  it("builds a walking Google Maps directions URL from ordered route points", () => {
    const url = buildGoogleMapsWalkingRouteUrl([
      place("start", 51.1097, 17.0325),
      place("middle", 51.1119, 17.0367),
      place("finish", 51.1208, 17.0332),
    ]);

    expect(url).not.toBeNull();
    const parsedUrl = new URL(url ?? "");
    expect(parsedUrl.origin).toBe("https://www.google.com");
    expect(parsedUrl.pathname).toBe("/maps/dir/");
    expect(parsedUrl.searchParams.get("api")).toBe("1");
    expect(parsedUrl.searchParams.get("origin")).toBe("51.1097,17.0325");
    expect(parsedUrl.searchParams.get("destination")).toBe("51.1208,17.0332");
    expect(parsedUrl.searchParams.get("waypoints")).toBe("51.1119,17.0367");
    expect(parsedUrl.searchParams.get("travelmode")).toBe("walking");
  });

  it("skips invalid coordinates before assigning origin and destination", () => {
    const url = buildGoogleMapsWalkingRouteUrl([
      place("invalid", Number.NaN, 17.0325),
      place("start", 51.1097, 17.0325),
      place("finish", 51.1208, 17.0332),
    ]);

    const parsedUrl = new URL(url ?? "");
    expect(parsedUrl.searchParams.get("origin")).toBe("51.1097,17.0325");
    expect(parsedUrl.searchParams.get("destination")).toBe("51.1208,17.0332");
    expect(parsedUrl.searchParams.has("waypoints")).toBe(false);
  });
});
