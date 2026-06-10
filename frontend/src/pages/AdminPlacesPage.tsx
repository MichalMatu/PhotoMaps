import { useEffect, useState } from "react";
import { Images, MapPin, Tags } from "lucide-react";

import {
  archivePlace,
  clearAdminToken,
  createPlace,
  getAdminCategories,
  getAdminPlaces,
  getAdminPhotos,
  getStoredAdminToken,
  updatePlace,
  type Category,
  type Photo,
  type PhotoStatus,
  type Place,
  type PlacePayload,
} from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import { AdminAccessGate } from "../components/admin/AdminAccessGate";
import { CategoryManager } from "../components/admin/CategoryManager";
import { PlaceForm } from "../components/admin/PlaceForm";
import { PhotoQueue } from "../components/admin/PhotoQueue";
import { SystemModal } from "../components/admin/SystemModal";

type AdminSection = "places" | "categories" | "photos";

export function AdminPlacesPage() {
  const [adminToken, setAdminToken] = useState(() => getStoredAdminToken());
  const [activeSection, setActiveSection] = useState<AdminSection>("places");
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
  const activeCategoryCount = categories.filter((category) => category.status === "active").length;

  async function refresh(nextPhotoStatusFilter = photoStatusFilter) {
    const [nextCategories, nextPlaces, nextPhotos, pendingPhotos, approvedPhotos, rejectedPhotos] = await Promise.all([
      getAdminCategories(),
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
    if (!adminToken) {
      return;
    }

    refresh(photoStatusFilter).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Nie udalo sie pobrac danych");
    });
  }, [adminToken, photoStatusFilter]);

  function handleClearAdminToken() {
    clearAdminToken();
    setAdminToken("");
    setError(null);
    setCategories([]);
    setEditingPlace(null);
    setPhotos([]);
    setPlaces([]);
  }

  if (!adminToken) {
    return (
      <AppShell activeSection="admin">
        <main className="page-shell admin-page">
          <AdminAccessGate onUnlocked={setAdminToken} />
        </main>
      </AppShell>
    );
  }

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
        <section className="admin-workspace">
          <header className="admin-header">
            <div>
              <span className="eyebrow">Panel redakcji</span>
              <h1>Admin</h1>
            </div>
            <div className="admin-metrics" aria-label="Podsumowanie panelu">
              <span>{places.length} miejsc</span>
              <span>{activeCategoryCount}/{categories.length} kategorii</span>
              <span>{photoStatusCounts.pending} zdjęć do sprawdzenia</span>
              <button className="ghost-button admin-token-button" type="button" onClick={handleClearAdminToken}>
                Zmień token
              </button>
            </div>
          </header>

          {error ? <p className="notice error">{error}</p> : null}

          <nav className="admin-section-tabs" aria-label="Sekcje panelu admina">
            <button
              className={activeSection === "places" ? "admin-section-tab is-active" : "admin-section-tab"}
              type="button"
              onClick={() => setActiveSection("places")}
            >
              <MapPin aria-hidden="true" size={20} />
              <span>Miejsca</span>
              <strong>{places.length}</strong>
            </button>
            <button
              className={activeSection === "categories" ? "admin-section-tab is-active" : "admin-section-tab"}
              type="button"
              onClick={() => setActiveSection("categories")}
            >
              <Tags aria-hidden="true" size={20} />
              <span>Kategorie</span>
              <strong>{categories.length}</strong>
            </button>
            <button
              className={activeSection === "photos" ? "admin-section-tab is-active" : "admin-section-tab"}
              type="button"
              onClick={() => setActiveSection("photos")}
            >
              <Images aria-hidden="true" size={20} />
              <span>Zdjęcia</span>
              <strong>{photoStatusCounts.pending}</strong>
            </button>
          </nav>

          {activeSection === "places" ? (
            <section className="admin-layout admin-section">
              <div className="admin-editor">
                <span className="eyebrow">Miejsca</span>
                <h2>{editingPlace ? "Edytuj miejsce" : "Dodaj miejsce"}</h2>
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
              </div>
            </section>
          ) : null}

          {activeSection === "categories" ? (
            <section className="admin-section admin-section-single">
              <CategoryManager categories={categories} onChanged={refresh} />
            </section>
          ) : null}

          {activeSection === "photos" ? (
            <section className="admin-section admin-section-single">
              <PhotoQueue
                photos={photos}
                places={places}
                statusCounts={photoStatusCounts}
                statusFilter={photoStatusFilter}
                onReviewed={refresh}
                onStatusFilterChange={setPhotoStatusFilter}
              />
            </section>
          ) : null}
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
