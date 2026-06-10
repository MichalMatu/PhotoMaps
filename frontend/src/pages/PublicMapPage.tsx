import { useEffect, useState } from "react";

import { getPlacePhotos, getPlaces, type Photo, type Place } from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import { PlaceMap } from "../components/map/PlaceMap";

export function PublicMapPage() {
  const [photosByPlaceId, setPhotosByPlaceId] = useState<Record<string, Photo[]>>({});
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadMapData();
  }, []);

  async function loadMapData() {
    setIsLoading(true);
    setError(null);
    try {
      const nextPlaces = await getPlaces();
      const photoEntries = await Promise.all(
        nextPlaces.map(async (place) => [place.id, await getPlacePhotos(place.id)] as const),
      );
      setPlaces(nextPlaces);
      setPhotosByPlaceId(Object.fromEntries(photoEntries));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udalo sie pobrac miejsc");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell activeSection="map">
      <main className="page-shell map-page">
        {isLoading || error ? (
          <div className="map-status-panel">
            {isLoading ? <p>Ładowanie mapy...</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </div>
        ) : null}
        <div className="map-frame">
          <PlaceMap
            places={places}
            photosByPlaceId={photosByPlaceId}
            onPhotoUploaded={loadMapData}
          />
        </div>
      </main>
    </AppShell>
  );
}
