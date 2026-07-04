import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getAppConfig } from "../api/appConfig";
import { getCities } from "../api/cities";
import { getMapPlacesForCities } from "../api/places";
import { AppShell } from "../components/layout/AppShell";
import {
  filterMapPlacesByCategories,
  getMapCategoryFilterItems,
  toggleMapCategoryFilter,
} from "../components/map/mapCategoryFilters";
import {
  mapCityForPlaceContent,
  mapFallbackForPlaceContent,
  selectDefaultMapCity,
} from "../components/map/mapCityContext";
import {
  countMapLayerPlaces,
  DEFAULT_MAP_LAYER_STATE,
  filterMapPlaces,
  hasAnyMapLayerActive,
  isAllMapLayerPresetActive,
  isMapLayerControlActive,
  MAP_LAYER_CONTROLS,
  type MapLayerControlId,
  toggleMapLayer,
} from "../components/map/mapLayers";
import { getPlacePreviewVisual } from "../components/map/placePreview";
import { PlaceMap } from "../components/map/PlaceMap";

export function PublicMapPage() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isPinnedMediaVisible, setIsPinnedMediaVisible] = useState(true);
  const [mapLayerState, setMapLayerState] = useState(DEFAULT_MAP_LAYER_STATE);
  const appConfigQuery = useQuery({
    queryKey: ["app-config"],
    queryFn: getAppConfig,
    staleTime: 300_000,
  });
  const citiesQuery = useQuery({
    queryKey: ["cities"],
    queryFn: getCities,
    staleTime: 60_000,
  });
  const activeCities = useMemo(
    () => (citiesQuery.data ?? []).filter((city) => city.status === "active"),
    [citiesQuery.data],
  );
  const activeCityIds = useMemo(() => activeCities.map((city) => city.id).join("|"), [activeCities]);
  const mapCity = useMemo(() => selectDefaultMapCity(activeCities), [activeCities]);
  const placesQuery = useQuery({
    queryKey: ["places-map", activeCityIds],
    queryFn: () => getMapPlacesForCities(activeCities),
    enabled: activeCities.length > 0,
    staleTime: 60_000,
  });
  const mapPlaces = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const effectiveMapCity = useMemo(() => mapCityForPlaceContent(mapCity, mapPlaces), [mapCity, mapPlaces]);
  const effectiveMapFallback = useMemo(
    () => (appConfigQuery.data ? mapFallbackForPlaceContent(appConfigQuery.data.map, mapPlaces) : null),
    [appConfigQuery.data, mapPlaces],
  );
  const layerPlaces = useMemo(() => filterMapPlaces(mapPlaces, mapLayerState), [mapLayerState, mapPlaces]);
  const visiblePlaces = useMemo(
    () => filterMapPlacesByCategories(layerPlaces, selectedCategoryIds),
    [layerPlaces, selectedCategoryIds],
  );
  const markerPlaces = useMemo(
    () => visiblePlaces.filter((place) => getPlacePreviewVisual(place) !== null),
    [visiblePlaces],
  );
  const categoryFilterItems = useMemo(() => getMapCategoryFilterItems(mapPlaces), [mapPlaces]);
  const layerCounts = useMemo(() => countMapLayerPlaces(mapPlaces), [mapPlaces]);
  const isAllLayerActive = isAllMapLayerPresetActive(mapLayerState);
  const hasAnyLayerActive = hasAnyMapLayerActive(mapLayerState);
  const isMapLoading = placesQuery.isLoading || citiesQuery.isLoading || appConfigQuery.isLoading;
  const isMapError = placesQuery.isError || citiesQuery.isError || appConfigQuery.isError;
  const hasActiveFilters =
    selectedCategoryIds.length > 0 ||
    (!isAllLayerActive && hasAnyLayerActive) ||
    mapPlaces.length !== visiblePlaces.length;
  const hasPlacesWithoutMapMedia = visiblePlaces.length > 0 && markerPlaces.length === 0;
  const showEmptyMapState = !isMapLoading && !isMapError && hasAnyLayerActive && markerPlaces.length === 0;

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
          active: isMapLayerControlActive(mapLayerState, layer.id),
          count: layerCounts[layer.id],
        })),
        onToggle: (layerId) =>
          setMapLayerState((currentState) => toggleMapLayer(currentState, layerId as MapLayerControlId)),
      }}
      mapPinnedMediaControl={{
        active: isPinnedMediaVisible,
        label: "Przypięte",
        onToggle: () => setIsPinnedMediaVisible((currentValue) => !currentValue),
      }}
    >
      <main className="page-shell map-page">
        {isMapLoading || isMapError ? (
          <div
            className={isMapError ? "ui-panel map-status-panel map-status-panel--error" : "ui-panel map-status-panel"}
            role="status"
          >
            {isMapLoading ? <p>Ładowanie mapy...</p> : null}
            {isMapError ? <p className="error-text">Nie udało się pobrać mapy</p> : null}
          </div>
        ) : null}
        {showEmptyMapState ? (
          <div className="ui-panel map-empty-panel" role="status">
            <p>
              {hasActiveFilters
                ? "Brak miejsc dla tych filtrów."
                : hasPlacesWithoutMapMedia
                  ? "Brak mediów do pokazania na mapie."
                  : "Brak miejsc do pokazania na mapie."}
            </p>
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
        {appConfigQuery.data && effectiveMapFallback && !isMapError ? (
          <div className="map-frame">
            <PlaceMap
              mapCity={effectiveMapCity}
              mapFallback={effectiveMapFallback}
              markerPlaces={markerPlaces}
              onPinnedMediaVisibleChange={setIsPinnedMediaVisible}
              pinnedMediaPlaces={mapPlaces}
              placeCustomFieldDefinitions={appConfigQuery.data.place_custom_fields}
              showPinnedMedia={isPinnedMediaVisible}
            />
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
