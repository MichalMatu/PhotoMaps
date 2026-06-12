import { AdminCategoriesSection } from "../components/admin/AdminCategoriesSection";
import { AdminCitiesSection } from "../components/admin/AdminCitiesSection";
import { AdminGuidesSection } from "../components/admin/AdminGuidesSection";
import { AdminMemoriesSection } from "../components/admin/AdminMemoriesSection";
import { AdminPhotosSection } from "../components/admin/AdminPhotosSection";
import { AppShell } from "../components/layout/AppShell";
import { AdminAccessGate } from "../components/admin/AdminAccessGate";
import { AdminPlacesSection } from "../components/admin/AdminPlacesSection";
import { AdminReportsSection } from "../components/admin/AdminReportsSection";
import { AdminSectionTabs } from "../components/admin/AdminSectionTabs";
import { PlaceForm } from "../components/admin/PlaceForm";
import { PlacePhotoPanel } from "../components/admin/PlacePhotoPanel";
import { SystemModal } from "../components/admin/SystemModal";
import { useAdminPanelData } from "../components/admin/useAdminPanelData";
import { useAdminPlaceManagement } from "../components/admin/useAdminPlaceManagement";
import { useAdminSectionState } from "../components/admin/useAdminSectionState";
import { ErrorModal } from "../components/ui/ErrorModal";

export function AdminPlacesPage() {
  const {
    accessMessage,
    adminToken,
    categories,
    cities,
    clearLoadError,
    clearSession,
    guides,
    loadError,
    memories,
    photos,
    places,
    refreshCities,
    refreshCategories,
    refreshGuides,
    refreshMemories,
    refreshPhotos,
    refreshPlaces,
    refreshReports,
    reports,
    setAdminToken,
  } = useAdminPanelData();
  const {
    activeSection,
    memoryStatusCounts,
    memoryStatusFilter,
    photoStatusCounts,
    photoStatusFilter,
    reportStatusCounts,
    reportStatusFilter,
    setActiveSection,
    setMemoryStatusFilter,
    setPhotoStatusFilter,
    setReportStatusFilter,
    visibleMemories,
    visiblePhotos,
    visibleReports,
  } = useAdminSectionState({
    memories,
    photos,
    reports,
  });
  const {
    clearArchiveRequest,
    clearDeleteRequest,
    clearOperationError,
    closePlaceModal,
    confirmArchivePlace,
    confirmDeletePlace,
    editingPlace,
    isArchiving,
    isDeleting,
    isPlaceModalOpen,
    openCreatePlaceModal,
    openEditPlaceModal,
    operationError: placeOperationError,
    placeToArchive,
    placeToDelete,
    requestArchivePlace,
    requestDeletePlace,
    submitPlace,
  } = useAdminPlaceManagement({
    isSessionActive: Boolean(adminToken),
    onPhotosChanged: refreshPhotos,
    onPlacesChanged: refreshPlaces,
  });
  const editingPlaceView = editingPlace ? (places.find((place) => place.id === editingPlace.id) ?? editingPlace) : null;
  const editingPlacePhotos = editingPlaceView ? photos.filter((photo) => photo.place_id === editingPlaceView.id) : [];

  async function refreshCategoriesAndPlaces() {
    await Promise.all([refreshCategories(), refreshPlaces()]);
  }

  if (!adminToken) {
    return (
      <AppShell activeSection="admin">
        <main className="page-shell admin-page">
          <AdminAccessGate
            message={accessMessage}
            onUnlocked={(token) => {
              clearOperationError();
              setAdminToken(token);
            }}
          />
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeSection="admin"
      adminAction={{ label: "Zmień token admina", onClick: clearSession, shortLabel: "A" }}
    >
      <main className="page-shell admin-page">
        <section className="admin-workspace">
          <AdminSectionTabs
            activeSection={activeSection}
            counts={{
              categories: categories.length,
              cities: cities.length,
              guides: guides.length,
              memories: memoryStatusCounts.all,
              photos: photoStatusCounts.all,
              places: places.length,
              reports: reportStatusCounts.all,
            }}
            onChange={setActiveSection}
          />

          {activeSection === "places" ? (
            <AdminPlacesSection
              categories={categories}
              cities={cities}
              editingPlaceId={editingPlace?.id ?? null}
              places={places}
              onArchive={requestArchivePlace}
              onCreate={openCreatePlaceModal}
              onDelete={requestDeletePlace}
              onEdit={openEditPlaceModal}
            />
          ) : null}

          {activeSection === "cities" ? (
            <AdminCitiesSection cities={cities} places={places} onChanged={refreshCities} />
          ) : null}

          {activeSection === "categories" ? (
            <AdminCategoriesSection categories={categories} places={places} onChanged={refreshCategoriesAndPlaces} />
          ) : null}

          {activeSection === "photos" ? (
            <AdminPhotosSection
              categories={categories}
              photos={visiblePhotos}
              places={places}
              statusCounts={photoStatusCounts}
              statusFilter={photoStatusFilter}
              onReviewed={refreshPhotos}
              onStatusFilterChange={setPhotoStatusFilter}
            />
          ) : null}

          {activeSection === "memories" ? (
            <AdminMemoriesSection
              categories={categories}
              memories={visibleMemories}
              places={places}
              statusCounts={memoryStatusCounts}
              statusFilter={memoryStatusFilter}
              onReviewed={refreshMemories}
              onStatusFilterChange={setMemoryStatusFilter}
            />
          ) : null}

          {activeSection === "guides" ? (
            <AdminGuidesSection guides={guides} places={places} onChanged={refreshGuides} />
          ) : null}

          {activeSection === "reports" ? (
            <AdminReportsSection
              reports={visibleReports}
              statusCounts={reportStatusCounts}
              statusFilter={reportStatusFilter}
              onChanged={refreshReports}
              onStatusFilterChange={setReportStatusFilter}
            />
          ) : null}
        </section>
        {isPlaceModalOpen ? (
          <SystemModal
            eyebrow="Miejsca"
            showActions={false}
            size="wide"
            title={editingPlace ? "Edytuj miejsce" : "Dodaj miejsce"}
            onClose={closePlaceModal}
          >
            <PlaceForm
              categories={categories}
              cities={cities}
              className="admin-form place-form place-form--modal"
              place={editingPlace}
              onCancel={closePlaceModal}
              onSubmit={submitPlace}
            />
            {editingPlaceView ? (
              <PlacePhotoPanel photos={editingPlacePhotos} place={editingPlaceView} onChanged={refreshPhotos} />
            ) : null}
          </SystemModal>
        ) : null}
        {placeToArchive ? (
          <SystemModal
            confirmLabel="Archiwizuj"
            isBusy={isArchiving}
            message={`Miejsce "${placeToArchive.title}" zniknie z publicznej mapy, ale zostanie w bazie jako archiwalne.`}
            title="Archiwizować miejsce?"
            tone="danger"
            onClose={clearArchiveRequest}
            onConfirm={confirmArchivePlace}
          />
        ) : null}
        {placeToDelete ? (
          <SystemModal
            confirmLabel="Usuń trwale"
            isBusy={isDeleting}
            message={`Miejsce "${placeToDelete.title}" zostanie trwale usunięte razem ze zdjęciami, pamiątkami, przypisaniami do tras i zgłoszeniami. Tej operacji nie da się cofnąć.`}
            title="Usunąć miejsce trwale?"
            tone="danger"
            onClose={clearDeleteRequest}
            onConfirm={confirmDeletePlace}
          />
        ) : null}
        {loadError ? <ErrorModal {...loadError} onClose={clearLoadError} /> : null}
        {placeOperationError ? <ErrorModal {...placeOperationError} onClose={clearOperationError} /> : null}
      </main>
    </AppShell>
  );
}
