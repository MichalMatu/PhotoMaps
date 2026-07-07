import type { AppConfigMapMarkerDensity, AppConfigMapMarkerPriority, PlaceMapItem } from "../../api/types";
import { MAX_PLACE_PRIORITY, MIN_PLACE_PRIORITY } from "../../config/placePriority";
import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

type MarkerDensityOptions = {
  markerDensity?: AppConfigMapMarkerDensity;
  markerPriority?: AppConfigMapMarkerPriority;
  viewportHeight: number;
  viewportWidth: number;
  zoom: number;
};

const DEFAULT_MARKER_DENSITY = MAP_DISPLAY_CONFIG.fallback.emptyCountryMap.marker_density;
const DEFAULT_MARKER_PRIORITY = MAP_DISPLAY_CONFIG.fallback.emptyCountryMap.marker_priority;
const MARKER_DENSITY_CONFIG = MAP_DISPLAY_CONFIG.markerDensity;

type RankedPlace = {
  index: number;
  place: PlaceMapItem;
  priority: number;
};

type AddPlaceOptions = {
  enforceCityLimit: boolean;
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

function zoomFillRatio(zoom: number, markerDensity: AppConfigMapMarkerDensity) {
  const safeZoom = Number.isFinite(zoom) ? zoom : MARKER_DENSITY_CONFIG.defaultZoom;
  const zoomRange = markerDensity.full_density_zoom - markerDensity.min_zoom;
  const progress = zoomRange > 0 ? clamp((safeZoom - markerDensity.min_zoom) / zoomRange, 0, 1) : 1;

  return (
    markerDensity.min_zoom_fill_ratio +
    (markerDensity.max_zoom_fill_ratio - markerDensity.min_zoom_fill_ratio) *
      Math.pow(progress, markerDensity.zoom_curve)
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

function maxPlacesPerCity(zoom: number, limit: number) {
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
    Math.min(limit, Math.ceil(1 + Math.pow(progress, MARKER_DENSITY_CONFIG.cityDetailZoomCurve) * (limit - 1))),
  );
}

export function getMapMarkerDensityLimit(places: PlaceMapItem[], options: MarkerDensityOptions): number {
  const markerDensity = options.markerDensity ?? DEFAULT_MARKER_DENSITY;
  if (places.length === 0) {
    return 0;
  }

  const viewportArea = safeViewportArea(options);
  if (viewportArea <= 0) {
    return 1;
  }

  const viewportCapacity = Math.max(
    1,
    Math.floor(viewportArea / Math.max(MARKER_DENSITY_CONFIG.minViewportSize, markerDensity.marker_viewport_area)),
  );
  const zoomAwareLimit = Math.max(1, Math.floor(viewportCapacity * zoomFillRatio(options.zoom, markerDensity)));
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

export function getMapPlacePriority(
  place: PlaceMapItem,
  markerPriority: AppConfigMapMarkerPriority = DEFAULT_MARKER_PRIORITY,
): number {
  const editorialWeight = clamp(
    Number.isFinite(place.weight) ? place.weight : 1,
    MIN_PLACE_PRIORITY,
    MAX_PLACE_PRIORITY,
  );
  const score = Math.max(0, Number.isFinite(place.score) ? place.score : 0);
  const photoCount = Math.max(0, place.photo_count);
  const memoryCount = Math.max(0, place.memory_count);
  const editorialPriority = editorialWeight * editorialWeight * markerPriority.editorial_weight_multiplier;
  const contentSignal =
    score * markerPriority.score_multiplier +
    Math.sqrt(photoCount) * markerPriority.photo_count_sqrt_multiplier +
    memoryCount * markerPriority.memory_count_multiplier;

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
  const cityLimit = maxPlacesPerCity(options.zoom, limit);

  if (places.length <= limit && everyCityFitsLimit(places, cityLimit)) {
    return places;
  }

  const rankedPlaces = places.map((place, index) => ({
    index,
    place,
    priority: getMapPlacePriority(place, options.markerPriority),
  }));
  const selectedIds = new Set<string>();
  const selectedCountByCity = new Map<string, number>();
  const addPlace = (place: PlaceMapItem, { enforceCityLimit }: AddPlaceOptions) => {
    const citySelectedCount = selectedCountByCity.get(place.city_id) ?? 0;
    if (
      selectedIds.has(place.id) ||
      selectedIds.size >= limit ||
      (enforceCityLimit && citySelectedCount >= cityLimit)
    ) {
      return;
    }

    selectedIds.add(place.id);
    selectedCountByCity.set(place.city_id, citySelectedCount + 1);
  };
  const rankedByPriority = [...rankedPlaces].sort(compareRankedPlaces);

  for (const rankedPlace of bestPlacePerCity(rankedPlaces)) {
    if (selectedIds.size >= limit) {
      break;
    }
    addPlace(rankedPlace.place, { enforceCityLimit: true });
  }

  for (const rankedPlace of rankedByPriority) {
    if (selectedIds.size >= limit) {
      break;
    }
    addPlace(rankedPlace.place, { enforceCityLimit: true });
  }

  return places.filter((place) => selectedIds.has(place.id));
}
