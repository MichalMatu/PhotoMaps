import { AdminCategoriesSection } from "../components/admin/AdminCategoriesSection";
import { AdminGuidesSection } from "../components/admin/AdminGuidesSection";
import { AdminMemoriesSection } from "../components/admin/AdminMemoriesSection";
import { AdminPhotosSection } from "../components/admin/AdminPhotosSection";
import { AppShell } from "../components/layout/AppShell";
import { AdminAccessGate } from "../components/admin/AdminAccessGate";
import { AdminPlacesSection } from "../components/admin/AdminPlacesSection";
import { AdminReportsSection } from "../components/admin/AdminReportsSection";
import { AdminSectionTabs } from "../components/admin/AdminSectionTabs";
import { PlaceForm } from "../components/admin/PlaceForm";
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
    clearLoadError,
    clearSession,
    guides,
    loadError,
    memories,
    photos,
    places,
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
    clearOperationError,
    closePlaceModal,
    confirmArchivePlace,
    editingPlace,
    isArchiving,
    isPlaceModalOpen,
    openCreatePlaceModal,
    openEditPlaceModal,
    operationError: placeOperationError,
    placeToArchive,
    requestArchivePlace,
    submitPlace,
  } = useAdminPlaceManagement({
    isSessionActive: Boolean(adminToken),
    onPlacesChanged: refreshPlaces,
  });

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
              editingPlaceId={editingPlace?.id ?? null}
              places={places}
              onArchive={requestArchivePlace}
              onCreate={openCreatePlaceModal}
              onEdit={openEditPlaceModal}
            />
          ) : null}

          {activeSection === "categories" ? (
            <AdminCategoriesSection categories={categories} places={places} onChanged={refreshCategories} />
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
              className="admin-form place-form place-form--modal"
              place={editingPlace}
              onCancel={closePlaceModal}
              onSubmit={submitPlace}
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
            onClose={clearArchiveRequest}
            onConfirm={confirmArchivePlace}
          />
        ) : null}
        {loadError ? <ErrorModal {...loadError} onClose={clearLoadError} /> : null}
        {placeOperationError ? <ErrorModal {...placeOperationError} onClose={clearOperationError} /> : null}
      </main>
    </AppShell>
  );
}
