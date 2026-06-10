import { useEffect, useState } from "react";

import {
  archivePlace,
  createPlace,
  getAdminPlaces,
  getAdminPhotos,
  getCategories,
  updatePlace,
  type Category,
  type Photo,
  type PhotoStatus,
  type Place,
  type PlacePayload,
} from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import { PlaceForm } from "../components/admin/PlaceForm";
import { PhotoQueue } from "../components/admin/PhotoQueue";
import { SystemModal } from "../components/admin/SystemModal";

export function AdminPlacesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoStatusCounts, setPhotoStatusCounts] = useState<Record<PhotoStatus | "all", number>>({
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0,
  });
  const [photoStatusFilter, setPhotoStatusFilter] = useState<PhotoStatus | "all">("all");
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeToArchive, setPlaceToArchive] = useState<Place | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  async function refresh(nextPhotoStatusFilter = photoStatusFilter) {
    const [nextCategories, nextPlaces, nextPhotos, pendingPhotos, approvedPhotos, rejectedPhotos] = await Promise.all([
      getCategories(),
      getAdminPlaces(),
      getAdminPhotos(nextPhotoStatusFilter),
      getAdminPhotos("pending"),
      getAdminPhotos("approved"),
      getAdminPhotos("rejected"),
    ]);
    setCategories(nextCategories);
    setPlaces(nextPlaces);
    setPhotos(nextPhotos);
    setPhotoStatusCounts({
      pending: pendingPhotos.length,
      approved: approvedPhotos.length,
      rejected: rejectedPhotos.length,
      all: pendingPhotos.length + approvedPhotos.length + rejectedPhotos.length,
    });
  }

  useEffect(() => {
    refresh(photoStatusFilter).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Nie udalo sie pobrac danych");
    });
  }, [photoStatusFilter]);

  async function handleSubmitPlace(payload: PlacePayload) {
    setError(null);
    try {
      if (editingPlace) {
        await updatePlace(editingPlace.id, payload);
        setEditingPlace(null);
      } else {
        await createPlace(payload);
      }
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udalo sie zapisac miejsca");
    }
  }

  async function handleConfirmArchivePlace() {
    if (!placeToArchive) {
      return;
    }

    setError(null);
    setIsArchiving(true);
    try {
      await archivePlace(placeToArchive.id);
      if (editingPlace?.id === placeToArchive.id) {
        setEditingPlace(null);
      }
      setPlaceToArchive(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udalo sie zarchiwizowac miejsca");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <AppShell activeSection="admin">
      <main className="page-shell admin-page">
        <section className="admin-layout">
          <div className="admin-editor">
            <span className="eyebrow">Panel redakcji</span>
            <h1>{editingPlace ? "Edytuj" : "Miejsce"}</h1>
            {error ? <p className="notice error">{error}</p> : null}
            <PlaceForm
              categories={categories}
              place={editingPlace}
              onCancel={() => setEditingPlace(null)}
              onSubmit={handleSubmitPlace}
            />
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
                <span>Akcje</span>
              </div>
              {places.map((place) => (
                <div className={editingPlace?.id === place.id ? "table-row is-selected" : "table-row"} role="row" key={place.id}>
                  <span>{place.title}</span>
                  <span>{place.status}</span>
                  <span>{place.category_id ? categoryById.get(place.category_id)?.label ?? place.category_id : "-"}</span>
                  <span>{place.weight.toFixed(1)}</span>
                  <span className="table-actions">
                    <button type="button" onClick={() => setEditingPlace(place)}>
                      Edytuj
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={place.status === "archived"}
                      onClick={() => setPlaceToArchive(place)}
                    >
                      Archiwizuj
                    </button>
                  </span>
                </div>
              ))}
              {places.length === 0 ? <p className="notice">Brak miejsc w bazie.</p> : null}
            </div>
            <PhotoQueue
              photos={photos}
              places={places}
              statusCounts={photoStatusCounts}
              statusFilter={photoStatusFilter}
              onReviewed={refresh}
              onStatusFilterChange={setPhotoStatusFilter}
            />
          </div>
        </section>
        {placeToArchive ? (
          <SystemModal
            confirmLabel="Archiwizuj"
            isBusy={isArchiving}
            message={`Miejsce "${placeToArchive.title}" zniknie z publicznej mapy, ale zostanie w bazie jako archiwalne.`}
            title="Archiwizować miejsce?"
            tone="danger"
            onClose={() => setPlaceToArchive(null)}
            onConfirm={handleConfirmArchivePlace}
          />
        ) : null}
      </main>
    </AppShell>
  );
}
