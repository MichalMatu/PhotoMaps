import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getAppConfig } from "../api/appConfig";
import { getMapPlaces } from "../api/places";
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
  hasAnyMapLayerActive,
  isAllMapLayerPresetActive,
  isMapLayerControlActive,
  MAP_LAYER_CONTROLS,
  type MapLayerControlId,
  toggleMapLayer,
} from "../components/map/mapLayers";
import { MAP_DISPLAY_CONFIG } from "../components/map/mapDisplayConfig";
import { getPlacePreviewVisual } from "../components/map/placePreview";
import { PlaceMap } from "../components/map/PlaceMap";
import { SEOHead } from "../components/ui/SEOHead";
import { DEFAULT_SEO_DESCRIPTION, DEFAULT_SEO_TITLE } from "../seo/pageSeo";

export function PublicMapPage() {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isAudioAutoplayEnabled, setIsAudioAutoplayEnabled] = useState(false);
  const [isPinnedMediaVisible, setIsPinnedMediaVisible] = useState(true);
  const [mapLayerState, setMapLayerState] = useState(DEFAULT_MAP_LAYER_STATE);
  const appConfigQuery = useQuery({
    queryKey: ["app-config"],
    queryFn: getAppConfig,
    staleTime: 300_000,
  });
  const placesQuery = useQuery({
    queryKey: ["places-map", "all"],
    queryFn: () => getMapPlaces(),
    staleTime: 60_000,
  });
  const mapPlaces = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
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
  const mapFallback = appConfigQuery.data?.map ?? MAP_DISPLAY_CONFIG.fallback.emptyCountryMap;
  const placeCustomFieldDefinitions = appConfigQuery.data?.place_custom_fields ?? [];
  const isMapLoading = placesQuery.isLoading || appConfigQuery.isLoading;
  const isMapError = placesQuery.isError;
  const hasActiveFilters =
    selectedCategoryIds.length > 0 ||
    (!isAllLayerActive && hasAnyLayerActive) ||
    mapPlaces.length !== visiblePlaces.length;
  const hasPlacesWithoutMapMedia = visiblePlaces.length > 0 && markerPlaces.length === 0;
  const showEmptyMapState = !isMapLoading && !isMapError && hasAnyLayerActive && markerPlaces.length === 0;

  return (
    <>
      <SEOHead title={DEFAULT_SEO_TITLE} description={DEFAULT_SEO_DESCRIPTION} url="/" />
      <AppShell
        activeSection="map"
        mapAudioControl={{
          active: isAudioAutoplayEnabled,
          label: "Audio",
          onToggle: () => setIsAudioAutoplayEnabled((currentValue) => !currentValue),
        }}
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
          {!isMapLoading && !isMapError ? (
            <div className="map-frame">
              <PlaceMap
                isAudioAutoplayEnabled={isAudioAutoplayEnabled}
                mapFallback={mapFallback}
                markerPlaces={markerPlaces}
                onPinnedMediaVisibleChange={setIsPinnedMediaVisible}
                pinnedMediaPlaces={mapPlaces}
                placeCustomFieldDefinitions={placeCustomFieldDefinitions}
                showPinnedMedia={isPinnedMediaVisible}
              />
            </div>
          ) : null}
        </main>
      </AppShell>
    </>
  );
}
