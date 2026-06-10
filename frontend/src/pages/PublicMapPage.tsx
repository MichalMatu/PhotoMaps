import { useEffect, useState } from "react";

import { getCategories, getPlaces, type Category, type Place } from "../api/client";
import { PlaceMap } from "../components/map/PlaceMap";

export function PublicMapPage() {
  const [categories, setCategories] = useState<Category[]>([]);
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
      setCategories(nextCategories);
      setPlaces(nextPlaces);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udalo sie pobrac miejsc");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell map-page">
      <header className="top-bar">
        <a className="brand" href="/">
          Wroclaw Bez Sciemy
        </a>
        <nav>
          <a href="/">Mapa</a>
          <a href="/admin">Admin</a>
        </nav>
      </header>

      <section className="map-layout">
        <aside className="map-panel">
          <span className="eyebrow">Lokalny przewodnik</span>
          <h1>Miejsca z charakterem</h1>
          <p>Wybrane adresy bez sieciowego szumu.</p>
          <div className="stat-grid">
            <div>
              <strong>{places.length}</strong>
              <span>opublikowane</span>
            </div>
            <div>
              <strong>{categories.length}</strong>
              <span>kategorii</span>
            </div>
          </div>
          {isLoading ? <p className="notice">Ladowanie mapy...</p> : null}
          {error ? <p className="notice error">{error}</p> : null}
          {!isLoading && !error && places.length === 0 ? (
            <p className="notice">Brak opublikowanych miejsc. Dodaj pierwsze w panelu admina.</p>
          ) : null}
        </aside>

        <div className="map-frame">
          <PlaceMap places={places} categories={categories} onPhotoUploaded={loadMapData} />
        </div>
      </section>
    </main>
  );
}
