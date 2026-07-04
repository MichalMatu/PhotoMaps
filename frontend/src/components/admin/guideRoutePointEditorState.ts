import type { GuideRoutePoint } from "../../api/types";

export type RoutePointPlace = {
  lat: number;
  lon: number;
};

function isValidCoordinate(lat: number, lon: number) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function normalizeGuideRoutePoint(lat: number, lon: number): GuideRoutePoint {
  return {
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
  };
}

export function routePointsFromPlaces(places: RoutePointPlace[]): GuideRoutePoint[] {
  return places
    .filter((place) => isValidCoordinate(place.lat, place.lon))
    .map((place) => normalizeGuideRoutePoint(place.lat, place.lon));
}

export function replaceGuideRoutePoint(
  points: GuideRoutePoint[],
  index: number,
  nextPoint: GuideRoutePoint,
): GuideRoutePoint[] {
  return points.map((point, pointIndex) => (pointIndex === index ? nextPoint : point));
}

export function removeGuideRoutePoint(points: GuideRoutePoint[], index: number): GuideRoutePoint[] {
  return points.filter((_, pointIndex) => pointIndex !== index);
}
