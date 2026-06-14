import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getMapPlaces } from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import {
  filterMapPlacesByCategories,
  getMapCategoryFilterItems,
  toggleMapCategoryFilter,
} from "../components/map/mapCategoryFilters";
import {
  countMapLayerPlaces,
  DEFAULT_MAP_LAYER_STATE,
  filterMapPlaces,
  isAllMapLayerPresetActive,
  MAP_LAYER_CONTROLS,
  type MapLayerControlId,
  toggleMapLayer,
} from "../components/map/mapLayers";
import { PlaceMap } from "../components/map/PlaceMap";

export function PublicMapPage() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [mapLayerState, setMapLayerState] = useState(DEFAULT_MAP_LAYER_STATE);
  const placesQuery = useQuery({
    queryKey: ["places-map"],
    queryFn: getMapPlaces,
    staleTime: 60_000,
  });
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const layerPlaces = useMemo(() => filterMapPlaces(places, mapLayerState), [mapLayerState, places]);
  const visiblePlaces = useMemo(
    () => filterMapPlacesByCategories(layerPlaces, selectedCategoryIds),
    [layerPlaces, selectedCategoryIds],
  );
  const categoryFilterItems = useMemo(() => getMapCategoryFilterItems(places), [places]);
  const layerCounts = useMemo(() => countMapLayerPlaces(places), [places]);
  const isAllLayerActive = isAllMapLayerPresetActive(mapLayerState);
  const hasActiveFilters =
    selectedCategoryIds.length > 0 || !isAllLayerActive || places.length !== visiblePlaces.length;
  const showEmptyMapState = !placesQuery.isLoading && !placesQuery.isError && visiblePlaces.length === 0;
  const showSparseMapState =
    !placesQuery.isLoading && !placesQuery.isError && visiblePlaces.length > 0 && visiblePlaces.length <= 2;

  return (
    <AppShell
      activeSection="map"
      mapCategoryControls={{
        items: categoryFilterItems.map((category) => ({
          ...category,
          active: selectedCategoryIds.includes(category.id),
        })),
        onClear: () => setSelectedCategoryIds([]),
        onToggle: (categoryId) =>
          setSelectedCategoryIds((currentCategoryIds) => toggleMapCategoryFilter(currentCategoryIds, categoryId)),
        selectedCount: selectedCategoryIds.length,
      }}
      mapLayerControls={{
        items: MAP_LAYER_CONTROLS.map((layer) => ({
          ...layer,
          active:
            layer.id === "all"
              ? isAllLayerActive
              : layer.id === "featured"
                ? mapLayerState.featuredOnly
                : !isAllLayerActive && mapLayerState[layer.id],
          count: layerCounts[layer.id],
        })),
        onToggle: (layerId) =>
          setMapLayerState((currentState) => toggleMapLayer(currentState, layerId as MapLayerControlId)),
      }}
    >
      <main className="page-shell map-page">
        {placesQuery.isLoading || placesQuery.isError ? (
          <div
            className={
              placesQuery.isError ? "ui-panel map-status-panel map-status-panel--error" : "ui-panel map-status-panel"
            }
            role="status"
          >
            {placesQuery.isLoading ? <p>Ładowanie mapy...</p> : null}
            {placesQuery.isError ? <p className="error-text">Nie udało się pobrać miejsc</p> : null}
          </div>
        ) : null}
        {showEmptyMapState ? (
          <div className="ui-panel map-empty-panel" role="status">
            <p>{hasActiveFilters ? "Brak miejsc dla tych filtrów." : "Brak miejsc do pokazania na mapie."}</p>
            {hasActiveFilters ? (
              <button
                className="ui-button ui-button--secondary"
                type="button"
                onClick={() => {
                  setSelectedCategoryIds([]);
                  setMapLayerState(DEFAULT_MAP_LAYER_STATE);
                }}
              >
                Wyczyść filtry
              </button>
            ) : null}
          </div>
        ) : null}
        {showSparseMapState ? (
          <div className="ui-panel map-sparse-panel" role="status">
            <p>{visiblePlaces.length === 1 ? "1 miejsce na mapie" : `${visiblePlaces.length} miejsca na mapie`}</p>
          </div>
        ) : null}
        <div className="map-frame">
          <PlaceMap mapCity={places[0]?.city ?? null} places={visiblePlaces} />
        </div>
      </main>
    </AppShell>
  );
}
