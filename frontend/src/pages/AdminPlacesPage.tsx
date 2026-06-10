import { useEffect, useState } from "react";

import {
  createPlace,
  getAdminPlaces,
  getCategories,
  type Category,
  type Place,
  type PlacePayload,
} from "../api/client";
import { PlaceForm } from "../components/admin/PlaceForm";

export function AdminPlacesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [nextCategories, nextPlaces] = await Promise.all([getCategories(), getAdminPlaces()]);
    setCategories(nextCategories);
    setPlaces(nextPlaces);
  }

  useEffect(() => {
    refresh().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Nie udalo sie pobrac danych");
    });
  }, []);

  async function handleCreate(payload: PlacePayload) {
    setError(null);
    try {
      await createPlace(payload);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udalo sie zapisac miejsca");
    }
  }

  return (
    <main className="page-shell admin-page">
      <header className="top-bar">
        <a className="brand" href="/">
          Wroclaw Bez Sciemy
        </a>
        <nav>
          <a href="/">Mapa</a>
          <a href="/admin">Admin</a>
        </nav>
      </header>

      <section className="admin-layout">
        <div className="admin-editor">
          <span className="eyebrow">Panel redakcji</span>
          <h1>Dodaj miejsce</h1>
          {error ? <p className="notice error">{error}</p> : null}
          <PlaceForm categories={categories} onSubmit={handleCreate} />
        </div>

        <div className="admin-list">
          <div className="section-heading">
            <h2>Miejsca</h2>
            <span>{places.length}</span>
          </div>
          <div className="place-table" role="table">
            <div className="table-row table-head" role="row">
              <span>Nazwa</span>
              <span>Status</span>
              <span>Kategoria</span>
              <span>Priorytet</span>
            </div>
            {places.map((place) => (
              <div className="table-row" role="row" key={place.id}>
                <span>{place.title}</span>
                <span>{place.status}</span>
                <span>{place.category_id ?? "-"}</span>
                <span>{place.weight.toFixed(1)}</span>
              </div>
            ))}
            {places.length === 0 ? <p className="notice">Brak miejsc w bazie.</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
