import type { PlaceMapItem } from "../../api/client";

const FEATURED_PLACE_WEIGHT = 2.5;

export type MapLayerControlId = "all" | "places" | "featured" | "memories";

export type MapLayerState = {
  featuredOnly: boolean;
  memories: boolean;
  places: boolean;
};

export const DEFAULT_MAP_LAYER_STATE: MapLayerState = {
  featuredOnly: false,
  memories: true,
  places: true,
};

export const MAP_LAYER_CONTROLS: Array<{ id: MapLayerControlId; label: string }> = [
  { id: "all", label: "Wszystkie" },
  { id: "featured", label: "Polecane" },
  { id: "places", label: "Miejsca" },
  { id: "memories", label: "Pamiątki" },
];

export function isAllMapLayerPresetActive(state: MapLayerState) {
  return state.places && state.memories && !state.featuredOnly;
}

function isFeaturedMapPlace(place: PlaceMapItem) {
  return place.weight >= FEATURED_PLACE_WEIGHT;
}

function placeHasMemories(place: PlaceMapItem) {
  return place.memory_count > 0 || place.preview_items.some((item) => item.kind === "memory");
}

function countPlaceMemories(place: PlaceMapItem) {
  const previewMemoryCount = place.preview_items.filter((item) => item.kind === "memory").length;
  return Math.max(place.memory_count, previewMemoryCount);
}

export function toggleMapLayer(state: MapLayerState, layerId: MapLayerControlId): MapLayerState {
  if (layerId === "all") {
    return DEFAULT_MAP_LAYER_STATE;
  }

  if (isAllMapLayerPresetActive(state) && layerId === "featured") {
    return {
      featuredOnly: true,
      memories: false,
      places: true,
    };
  }

  if (layerId === "featured") {
    return {
      ...state,
      featuredOnly: !state.featuredOnly,
    };
  }

  if (isAllMapLayerPresetActive(state)) {
    return {
      featuredOnly: false,
      memories: layerId === "memories",
      places: layerId === "places",
    };
  }

  const nextState = {
    ...state,
    [layerId]: !state[layerId],
  };
  if (!nextState.places && !nextState.memories) {
    return state;
  }
  return nextState;
}

function placeMatchesMapLayerState(place: PlaceMapItem, state: MapLayerState) {
  if (state.featuredOnly && !isFeaturedMapPlace(place)) {
    return false;
  }

  if (state.places) {
    return true;
  }

  return state.memories && placeHasMemories(place);
}

function filterMapPlaceContent(place: PlaceMapItem, state: MapLayerState): PlaceMapItem {
  if (state.places && state.memories) {
    return place;
  }

  return {
    ...place,
    preview_items: place.preview_items.filter((item) => {
      if (item.kind === "memory") {
        return state.memories;
      }
      return state.places;
    }),
  };
}

export function filterMapPlaces(places: PlaceMapItem[], state: MapLayerState) {
  return places
    .filter((place) => placeMatchesMapLayerState(place, state))
    .map((place) => filterMapPlaceContent(place, state));
}

export function countMapLayerPlaces(places: PlaceMapItem[]): Record<MapLayerControlId, number> {
  const memoryCount = places.reduce((total, place) => total + countPlaceMemories(place), 0);

  return {
    all: places.length + memoryCount,
    featured: places.filter(isFeaturedMapPlace).length,
    memories: memoryCount,
    places: places.length,
  };
}
