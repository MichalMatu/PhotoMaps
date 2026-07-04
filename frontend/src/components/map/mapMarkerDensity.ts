import type { PlaceMapItem } from "../../api/types";
import { MAX_PLACE_PRIORITY, MIN_PLACE_PRIORITY } from "../../config/placePriority";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

type MarkerDensityOptions = {
  viewportHeight: number;
  viewportWidth: number;
  zoom: number;
};

const MARKER_DENSITY_CONFIG = MAP_DISPLAY_CONFIG.markerDensity;
const MARKER_PRIORITY_CONFIG = MAP_DISPLAY_CONFIG.markerPriority;

type RankedPlace = {
  index: number;
  place: PlaceMapItem;
  priority: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeViewportArea({
  viewportHeight,
  viewportWidth,
}: Pick<MarkerDensityOptions, "viewportHeight" | "viewportWidth">) {
  if (!Number.isFinite(viewportWidth) || !Number.isFinite(viewportHeight)) {
    return 0;
  }

  return Math.max(0, viewportWidth * viewportHeight);
}

function zoomFillRatio(zoom: number) {
  const safeZoom = Number.isFinite(zoom) ? zoom : MARKER_DENSITY_CONFIG.defaultZoom;
  const zoomRange = MARKER_DENSITY_CONFIG.fullDensityZoom - MARKER_DENSITY_CONFIG.minZoom;
  const progress = zoomRange > 0 ? clamp((safeZoom - MARKER_DENSITY_CONFIG.minZoom) / zoomRange, 0, 1) : 1;

  return (
    MARKER_DENSITY_CONFIG.minZoomFillRatio +
    (MARKER_DENSITY_CONFIG.maxZoomFillRatio - MARKER_DENSITY_CONFIG.minZoomFillRatio) *
      Math.pow(progress, MARKER_DENSITY_CONFIG.zoomCurve)
  );
}

function cityCount(places: PlaceMapItem[]) {
  return new Set(places.map((place) => place.city_id)).size;
}

function placeCountsByCity(places: PlaceMapItem[]) {
  const counts = new Map<string, number>();

  for (const place of places) {
    counts.set(place.city_id, (counts.get(place.city_id) ?? 0) + 1);
  }

  return counts;
}

function everyCityFitsLimit(places: PlaceMapItem[], cityLimit: number) {
  for (const count of placeCountsByCity(places).values()) {
    if (count > cityLimit) {
      return false;
    }
  }

  return true;
}

function maxPlacesPerCity(places: PlaceMapItem[], zoom: number, limit: number) {
  const safeZoom = Number.isFinite(zoom) ? zoom : MARKER_DENSITY_CONFIG.defaultZoom;
  if (safeZoom < MARKER_DENSITY_CONFIG.cityDetailZoomStart) {
    return 1;
  }

  const zoomRange = MARKER_DENSITY_CONFIG.fullCityDetailZoom - MARKER_DENSITY_CONFIG.cityDetailZoomStart;
  const progress = zoomRange > 0 ? clamp((safeZoom - MARKER_DENSITY_CONFIG.cityDetailZoomStart) / zoomRange, 0, 1) : 1;

  if (progress >= 1) {
    return limit;
  }

  return Math.max(
    1,
    Math.floor(
      1 +
        Math.pow(progress, MARKER_DENSITY_CONFIG.cityDetailZoomCurve) *
          MARKER_DENSITY_CONFIG.maxCityRepresentativesBeforeDetail,
    ),
  );
}

export function getMapMarkerDensityLimit(places: PlaceMapItem[], options: MarkerDensityOptions): number {
  if (places.length === 0) {
    return 0;
  }

  const viewportArea = safeViewportArea(options);
  if (viewportArea <= 0) {
    return 1;
  }

  const viewportCapacity = Math.max(
    1,
    Math.floor(
      viewportArea / Math.max(MARKER_DENSITY_CONFIG.minViewportSize, MARKER_DENSITY_CONFIG.markerViewportArea),
    ),
  );
  const zoomAwareLimit = Math.max(1, Math.floor(viewportCapacity * zoomFillRatio(options.zoom)));
  const cityRepresentativeLimit = Math.max(
    1,
    Math.floor(
      viewportArea /
        Math.max(MARKER_DENSITY_CONFIG.minViewportSize, MARKER_DENSITY_CONFIG.cityRepresentativeViewportArea),
    ),
  );
  const cityDiversityFloor = Math.min(cityCount(places), cityRepresentativeLimit);

  return Math.min(places.length, Math.max(zoomAwareLimit, cityDiversityFloor));
}

export function getMapPlacePriority(place: PlaceMapItem): number {
  const editorialWeight = clamp(
    Number.isFinite(place.weight) ? place.weight : 1,
    MIN_PLACE_PRIORITY,
    MAX_PLACE_PRIORITY,
  );
  const score = Math.max(0, Number.isFinite(place.score) ? place.score : 0);
  const photoCount = Math.max(0, place.photo_count);
  const memoryCount = Math.max(0, place.memory_count);
  const editorialPriority = editorialWeight * editorialWeight * MARKER_PRIORITY_CONFIG.editorialWeightMultiplier;
  const contentSignal =
    score * MARKER_PRIORITY_CONFIG.scoreMultiplier +
    Math.sqrt(photoCount) * MARKER_PRIORITY_CONFIG.photoCountSqrtMultiplier +
    memoryCount * MARKER_PRIORITY_CONFIG.memoryCountMultiplier;

  return editorialPriority + contentSignal;
}

function compareRankedPlaces(left: RankedPlace, right: RankedPlace) {
  return right.priority - left.priority || left.index - right.index;
}

function bestPlacePerCity(rankedPlaces: RankedPlace[]) {
  const cityEntries = new Map<string, RankedPlace>();

  for (const rankedPlace of rankedPlaces) {
    const currentBest = cityEntries.get(rankedPlace.place.city_id);
    if (!currentBest || compareRankedPlaces(rankedPlace, currentBest) < 0) {
      cityEntries.set(rankedPlace.place.city_id, rankedPlace);
    }
  }

  return [...cityEntries.values()].sort((left, right) => {
    const priorityOrder = compareRankedPlaces(left, right);
    if (priorityOrder !== 0) {
      return priorityOrder;
    }

    return (
      left.place.city.sort_order - right.place.city.sort_order ||
      left.place.city.name.localeCompare(right.place.city.name)
    );
  });
}

export function limitMapMarkersByDensity(places: PlaceMapItem[], options: MarkerDensityOptions): PlaceMapItem[] {
  const limit = getMapMarkerDensityLimit(places, options);
  const cityLimit = maxPlacesPerCity(places, options.zoom, limit);

  if (places.length <= limit && everyCityFitsLimit(places, cityLimit)) {
    return places;
  }

  const rankedPlaces = places.map((place, index) => ({ index, place, priority: getMapPlacePriority(place) }));
  const selectedIds = new Set<string>();
  const selectedCountByCity = new Map<string, number>();
  const addPlace = (place: PlaceMapItem) => {
    const citySelectedCount = selectedCountByCity.get(place.city_id) ?? 0;
    if (selectedIds.has(place.id) || citySelectedCount >= cityLimit || selectedIds.size >= limit) {
      return;
    }

    selectedIds.add(place.id);
    selectedCountByCity.set(place.city_id, citySelectedCount + 1);
  };

  for (const rankedPlace of bestPlacePerCity(rankedPlaces)) {
    if (selectedIds.size >= limit) {
      break;
    }
    addPlace(rankedPlace.place);
  }

  for (const rankedPlace of [...rankedPlaces].sort(compareRankedPlaces)) {
    if (selectedIds.size >= limit) {
      break;
    }
    addPlace(rankedPlace.place);
  }

  return places.filter((place) => selectedIds.has(place.id));
}
