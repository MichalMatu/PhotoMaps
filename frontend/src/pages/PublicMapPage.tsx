import { useQuery } from "@tanstack/react-query";

import { getMapPlaces } from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import { PlaceMap } from "../components/map/PlaceMap";

export function PublicMapPage() {
  const placesQuery = useQuery({
    queryKey: ["places-map"],
    queryFn: getMapPlaces,
    staleTime: 60_000,
  });

  return (
    <AppShell activeSection="map">
      <main className="page-shell map-page">
        {placesQuery.isLoading || placesQuery.isError ? (
          <div className={placesQuery.isError ? "map-status-panel map-status-panel--error" : "map-status-panel"} role="status">
            {placesQuery.isLoading ? <p>Ładowanie mapy...</p> : null}
            {placesQuery.isError ? <p className="error-text">Nie udało się pobrać miejsc</p> : null}
          </div>
        ) : null}
        <div className="map-frame">
          <PlaceMap places={placesQuery.data ?? []} />
        </div>
      </main>
    </AppShell>
  );
}
