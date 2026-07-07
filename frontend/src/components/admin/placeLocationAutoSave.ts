import type { PlaceUpdatePayload } from "../../api/types";

export type PlaceLocation = {
  lat: number;
  lon: number;
};

export type PlaceLocationAutoSaveStatus = "idle" | "saving" | "saved" | "error";

export function hasPlaceLocationChanged(current: PlaceLocation, next: PlaceLocation) {
  return current.lat !== next.lat || current.lon !== next.lon;
}

export function placeLocationUpdatePayload(location: PlaceLocation): Pick<PlaceUpdatePayload, "lat" | "lon"> {
  return {
    lat: location.lat,
    lon: location.lon,
  };
}

export function placeLocationAutoSaveLabel(status: PlaceLocationAutoSaveStatus) {
  switch (status) {
    case "saving":
      return "Zapisywanie pozycji...";
    case "saved":
      return "Pozycja zapisana";
    case "error":
      return "Nie zapisano pozycji";
    case "idle":
      return null;
  }
}
