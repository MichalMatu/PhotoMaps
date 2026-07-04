import type { PublicGuidePlacePreview } from "../../api/types";

const GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/";

function isRoutePoint(place: PublicGuidePlacePreview) {
  return Number.isFinite(place.lat) && Number.isFinite(place.lon);
}

function formatCoordinate(value: number) {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function formatRoutePoint(place: PublicGuidePlacePreview) {
  return `${formatCoordinate(place.lat)},${formatCoordinate(place.lon)}`;
}

export function buildGoogleMapsWalkingRouteUrl(places: PublicGuidePlacePreview[]) {
  const routePoints = places.filter(isRoutePoint);
  if (routePoints.length < 2) {
    return null;
  }

  const [origin] = routePoints;
  const destination = routePoints[routePoints.length - 1];
  const waypoints = routePoints.slice(1, -1).map(formatRoutePoint);
  const params = new URLSearchParams({
    api: "1",
    destination: formatRoutePoint(destination),
    origin: formatRoutePoint(origin),
    travelmode: "walking",
  });

  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }

  return `${GOOGLE_MAPS_DIRECTIONS_URL}?${params.toString()}`;
}
