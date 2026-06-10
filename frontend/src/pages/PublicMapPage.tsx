import { useEffect, useState } from "react";

import { getCategories, getPlacePhotos, getPlaces, type Category, type Photo, type Place } from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import { PlaceMap } from "../components/map/PlaceMap";

export function PublicMapPage() {
  const [categories, setCategories] = useState<Category[]>([]);
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
      const [nextCategories, nextPlaces] = await Promise.all([getCategories(), getPlaces()]);
      const photoEntries = await Promise.all(
        nextPlaces.map(async (place) => [place.id, await getPlacePhotos(place.id)] as const),
      );
      setCategories(nextCategories);
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
        {(isLoading || error || places.length === 0) ? (
          <div className="map-status-panel">
            <span className="eyebrow">Wroclaw Bez Sciemy</span>
            {isLoading ? <p>Ładowanie mapy...</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
            {!isLoading && !error && places.length === 0 ? <p>Brak opublikowanych miejsc.</p> : null}
          </div>
        ) : null}
        <div className="map-frame">
          <PlaceMap
            places={places}
            categories={categories}
            photosByPlaceId={photosByPlaceId}
            onPhotoUploaded={loadMapData}
          />
        </div>
      </main>
    </AppShell>
  );
}
