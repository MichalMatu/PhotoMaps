import { useEffect, useMemo, useState } from "react";
import { BookOpen, Flag, Images, MapPin, MessageSquare, Tags } from "lucide-react";

import {
  archivePlace,
  clearAdminToken,
  createPlace,
  getAdminCategories,
  getAdminGuides,
  getAdminMemories,
  getAdminPlaces,
  getAdminPhotos,
  getAdminReports,
  getStoredAdminToken,
  updatePlace,
  ApiError,
  type Category,
  type Guide,
  type Memory,
  type Photo,
  type PhotoStatus,
  type Place,
  type PlacePayload,
  type Report,
  type ReportStatus,
} from "../api/client";
import { AppShell } from "../components/layout/AppShell";
import { AdminAccessGate } from "../components/admin/AdminAccessGate";
import { CategoryManager } from "../components/admin/CategoryManager";
import { GuideManager } from "../components/admin/GuideManager";
import { MemoryQueue } from "../components/admin/MemoryQueue";
import { PlaceForm } from "../components/admin/PlaceForm";
import { PhotoQueue } from "../components/admin/PhotoQueue";
import { ReportQueue } from "../components/admin/ReportQueue";
import { SystemModal } from "../components/admin/SystemModal";
import { ErrorModal, errorDetails, type OperationError } from "../components/ui/ErrorModal";

type AdminSection = "places" | "categories" | "photos" | "memories" | "guides" | "reports";

export function AdminPlacesPage() {
  const [adminToken, setAdminToken] = useState(() => getStoredAdminToken());
  const [activeSection, setActiveSection] = useState<AdminSection>("places");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryStatusFilter, setMemoryStatusFilter] = useState<PhotoStatus | "all">("all");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoStatusFilter, setPhotoStatusFilter] = useState<PhotoStatus | "all">("all");
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeToArchive, setPlaceToArchive] = useState<Place | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatus | "all">("all");
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const visiblePhotos = useMemo(
    () => (photoStatusFilter === "all" ? photos : photos.filter((photo) => photo.status === photoStatusFilter)),
    [photoStatusFilter, photos],
  );
  const visibleMemories = useMemo(
    () => (memoryStatusFilter === "all" ? memories : memories.filter((memory) => memory.status === memoryStatusFilter)),
    [memoryStatusFilter, memories],
  );
  const visibleReports = useMemo(
    () => (reportStatusFilter === "all" ? reports : reports.filter((report) => report.status === reportStatusFilter)),
    [reportStatusFilter, reports],
  );
  const photoStatusCounts = useMemo(
    () => ({
      all: photos.length,
      pending: photos.filter((photo) => photo.status === "pending").length,
      approved: photos.filter((photo) => photo.status === "approved").length,
      rejected: photos.filter((photo) => photo.status === "rejected").length,
    }),
    [photos],
  );
  const placeStatusCounts = useMemo(
    () => ({
      archived: places.filter((place) => place.status === "archived").length,
      draft: places.filter((place) => place.status === "draft").length,
      published: places.filter((place) => place.status === "published").length,
    }),
    [places],
  );
  const memoryStatusCounts = useMemo(
    () => ({
      all: memories.length,
      pending: memories.filter((memory) => memory.status === "pending").length,
      approved: memories.filter((memory) => memory.status === "approved").length,
      rejected: memories.filter((memory) => memory.status === "rejected").length,
    }),
    [memories],
  );
  const reportStatusCounts = useMemo(
    () => ({
      all: reports.length,
      open: reports.filter((report) => report.status === "open").length,
      closed: reports.filter((report) => report.status === "closed").length,
    }),
    [reports],
  );

  async function refresh() {
    const [nextCategories, nextGuides, nextMemories, nextPlaces, nextPhotos, nextReports] = await Promise.all([
      getAdminCategories(),
      getAdminGuides(),
      getAdminMemories(),
      getAdminPlaces(),
      getAdminPhotos(),
      getAdminReports(),
    ]);
    setCategories(nextCategories);
    setGuides(nextGuides);
    setMemories(nextMemories);
    setPlaces(nextPlaces);
    setPhotos(nextPhotos);
    setReports(nextReports);
    setAccessMessage(null);
    setOperationError(null);
  }

  async function refreshCategories() {
    setCategories(await getAdminCategories());
  }

  async function refreshGuides() {
    setGuides(await getAdminGuides());
  }

  async function refreshPlaces() {
    setPlaces(await getAdminPlaces());
  }

  async function refreshPhotos() {
    const [nextPhotos, nextPlaces] = await Promise.all([getAdminPhotos(), getAdminPlaces()]);
    setPhotos(nextPhotos);
    setPlaces(nextPlaces);
  }

  async function refreshMemories() {
    const [nextMemories, nextPlaces] = await Promise.all([getAdminMemories(), getAdminPlaces()]);
    setMemories(nextMemories);
    setPlaces(nextPlaces);
  }

  async function refreshReports() {
    setReports(await getAdminReports());
  }

  useEffect(() => {
    if (!adminToken) {
      return;
    }

    refresh().catch((reason: unknown) => {
      if (reason instanceof ApiError && (reason.status === 401 || reason.status === 503)) {
        clearAdminToken();
        setAdminToken("");
        setAccessMessage(reason.message);
        setCategories([]);
        setEditingPlace(null);
        setGuides([]);
        setMemories([]);
        setPhotos([]);
        setPlaces([]);
        setReports([]);
        return;
      }
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się pobrać danych panelu admina. Sprawdź backend i spróbuj ponownie.",
        title: "Nie udało się pobrać danych",
      });
    });
  }, [adminToken]);

  function handleClearAdminToken() {
    clearAdminToken();
    setAdminToken("");
    setAccessMessage(null);
    setOperationError(null);
    setCategories([]);
    setEditingPlace(null);
    setGuides([]);
    setMemories([]);
    setPhotos([]);
    setPlaces([]);
    setReports([]);
  }

  if (!adminToken) {
    return (
      <AppShell activeSection="admin">
        <main className="page-shell admin-page">
          <AdminAccessGate
            message={accessMessage}
            onUnlocked={(token) => {
              setAccessMessage(null);
              setOperationError(null);
              setAdminToken(token);
            }}
          />
        </main>
      </AppShell>
    );
  }

  async function handleSubmitPlace(payload: PlacePayload) {
    setOperationError(null);
    try {
      if (editingPlace) {
        await updatePlace(editingPlace.id, payload);
      } else {
        await createPlace(payload);
      }
      setEditingPlace(null);
      setIsPlaceModalOpen(false);
      await refreshPlaces();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać miejsca. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać miejsca",
      });
    }
  }

  function openCreatePlaceModal() {
    setEditingPlace(null);
    setIsPlaceModalOpen(true);
  }

  function openEditPlaceModal(place: Place) {
    setEditingPlace(place);
    setIsPlaceModalOpen(true);
  }

  function handleClosePlaceModal() {
    setEditingPlace(null);
    setIsPlaceModalOpen(false);
  }

  async function handleConfirmArchivePlace() {
    if (!placeToArchive) {
      return;
    }

    setOperationError(null);
    setIsArchiving(true);
    try {
      await archivePlace(placeToArchive.id);
      if (editingPlace?.id === placeToArchive.id) {
        setEditingPlace(null);
      }
      setPlaceToArchive(null);
      await refreshPlaces();
    } catch (reason) {
      setPlaceToArchive(null);
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zarchiwizować miejsca. Spróbuj ponownie.",
        title: "Nie udało się zarchiwizować miejsca",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <AppShell
      activeSection="admin"
      adminAction={{ label: "Zmień token admina", onClick: handleClearAdminToken, shortLabel: "A" }}
    >
      <main className="page-shell admin-page">
        <section className="admin-workspace">
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
              <strong>{photoStatusCounts.all}</strong>
            </button>
            <button
              className={activeSection === "memories" ? "admin-section-tab is-active" : "admin-section-tab"}
              type="button"
              onClick={() => setActiveSection("memories")}
            >
              <MessageSquare aria-hidden="true" size={20} />
              <span>Pamiątki</span>
              <strong>{memoryStatusCounts.all}</strong>
            </button>
            <button
              className={activeSection === "guides" ? "admin-section-tab is-active" : "admin-section-tab"}
              type="button"
              onClick={() => setActiveSection("guides")}
            >
              <BookOpen aria-hidden="true" size={20} />
              <span>Przewodniki</span>
              <strong>{guides.length}</strong>
            </button>
            <button
              className={activeSection === "reports" ? "admin-section-tab is-active" : "admin-section-tab"}
              type="button"
              onClick={() => setActiveSection("reports")}
            >
              <Flag aria-hidden="true" size={20} />
              <span>Zgłoszenia</span>
              <strong>{reportStatusCounts.all}</strong>
            </button>
          </nav>

          {activeSection === "places" ? (
            <section className="admin-section admin-section-single places-manager">
              <div className="place-toolbar">
                <div className="admin-summary-pills" aria-label="Status miejsc">
                  <span>Wszystkie {places.length}</span>
                  <span>Opublikowane {placeStatusCounts.published}</span>
                  <span>Szkice {placeStatusCounts.draft}</span>
                  <span>Archiwalne {placeStatusCounts.archived}</span>
                </div>
                <button type="button" onClick={openCreatePlaceModal}>
                  Dodaj miejsce
                </button>
              </div>

              <div className="admin-list">
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
                        <button type="button" onClick={() => openEditPlaceModal(place)}>
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
              <CategoryManager categories={categories} places={places} onChanged={refreshCategories} />
            </section>
          ) : null}

          {activeSection === "photos" ? (
            <section className="admin-section admin-section-single">
              <PhotoQueue
                categories={categories}
                photos={visiblePhotos}
                places={places}
                statusCounts={photoStatusCounts}
                statusFilter={photoStatusFilter}
                onReviewed={refreshPhotos}
                onStatusFilterChange={setPhotoStatusFilter}
              />
            </section>
          ) : null}

          {activeSection === "memories" ? (
            <section className="admin-section admin-section-single">
              <MemoryQueue
                categories={categories}
                memories={visibleMemories}
                places={places}
                statusCounts={memoryStatusCounts}
                statusFilter={memoryStatusFilter}
                onReviewed={refreshMemories}
                onStatusFilterChange={setMemoryStatusFilter}
              />
            </section>
          ) : null}

          {activeSection === "guides" ? <GuideManager guides={guides} places={places} onChanged={refreshGuides} /> : null}

          {activeSection === "reports" ? (
            <section className="admin-section admin-section-single">
              <ReportQueue
                reports={visibleReports}
                statusCounts={reportStatusCounts}
                statusFilter={reportStatusFilter}
                onChanged={refreshReports}
                onStatusFilterChange={setReportStatusFilter}
              />
            </section>
          ) : null}
        </section>
        {isPlaceModalOpen ? (
          <SystemModal
            eyebrow="Miejsca"
            showActions={false}
            size="wide"
            title={editingPlace ? "Edytuj miejsce" : "Dodaj miejsce"}
            onClose={handleClosePlaceModal}
          >
            <PlaceForm
              categories={categories}
              className="admin-form place-form place-form--modal"
              place={editingPlace}
              onCancel={handleClosePlaceModal}
              onSubmit={handleSubmitPlace}
            />
          </SystemModal>
        ) : null}
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
        {operationError ? <ErrorModal {...operationError} onClose={() => setOperationError(null)} /> : null}
      </main>
    </AppShell>
  );
}
