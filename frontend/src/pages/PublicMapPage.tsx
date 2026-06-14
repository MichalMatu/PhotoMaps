import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getMapPlaces } from "../api/client";
import { AppShell } from "../components/layout/AppShell";
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
  const [mapLayerState, setMapLayerState] = useState(DEFAULT_MAP_LAYER_STATE);
  const placesQuery = useQuery({
    queryKey: ["places-map"],
    queryFn: getMapPlaces,
    staleTime: 60_000,
  });
  const places = useMemo(() => placesQuery.data ?? [], [placesQuery.data]);
  const visiblePlaces = useMemo(() => filterMapPlaces(places, mapLayerState), [mapLayerState, places]);
  const layerCounts = useMemo(() => countMapLayerPlaces(places), [places]);
  const isAllLayerActive = isAllMapLayerPresetActive(mapLayerState);

  return (
    <AppShell
      activeSection="map"
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
        <div className="map-frame">
          <PlaceMap mapCity={places[0]?.city ?? null} places={visiblePlaces} />
        </div>
      </main>
    </AppShell>
  );
}
