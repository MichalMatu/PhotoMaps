import { useState } from "react";

import { AdminGuidesSection } from "../components/admin/AdminGuidesSection";
import { AppShell } from "../components/layout/AppShell";
import { AdminAccessGate } from "../components/admin/AdminAccessGate";
import { AdminConfigurationSection } from "../components/admin/AdminConfigurationSection";
import { AdminModerationSection } from "../components/admin/AdminModerationSection";
import { AdminPlacesModalLayer } from "../components/admin/AdminPlacesModalLayer";
import { AdminPlacesSection } from "../components/admin/AdminPlacesSection";
import { AdminSectionTabs } from "../components/admin/AdminSectionTabs";
import { useCityActions } from "../components/admin/useCityActions";
import { useAdminPanelData } from "../components/admin/useAdminPanelData";
import { useAdminPlaceManagement } from "../components/admin/useAdminPlaceManagement";
import { useAdminModerationRefreshActions } from "../components/admin/useAdminModerationRefreshActions";
import { useAdminPlaceRefreshActions } from "../components/admin/useAdminPlaceRefreshActions";
import { useAdminSectionState } from "../components/admin/useAdminSectionState";
import { SEOHead } from "../components/ui/SEOHead";

function AdminPlacesSEOHead() {
  return (
    <SEOHead
      title="Panel admina | PhotoMap"
      description="Prywatny panel korekt, moderacji i konfiguracji PhotoMap."
      robots="noindex,nofollow"
      url="/admin"
    />
  );
}

export function AdminPlacesPage() {
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [photoPreviewPlaceId, setPhotoPreviewPlaceId] = useState<string | null>(null);
  const [publicPreviewPlaceId, setPublicPreviewPlaceId] = useState<string | null>(null);
  const {
    accessMessage,
    adminToken,
    appConfig,
    categories,
    cities,
    clearLoadError,
    clearSession,
    guides,
    hasMoreMemories,
    hasMoreReports,
    isLoadingMoreMemories,
    isLoadingMoreReports,
    loadMoreMemories,
    loadMoreReports,
    loadError,
    mapPlaces,
    memories,
    moderationCounts,
    places,
    refreshCities,
    refreshCategories,
    refreshGuides,
    refreshMapPlaces,
    refreshMemories,
    refreshModerationCounts,
    refreshPlaces,
    refreshReports,
    reports,
    replaceAppConfig,
    setAdminToken,
  } = useAdminPanelData();
  const {
    activeModerationSection,
    activeModerationFilterCount,
    activeSection,
    memoryStatusCounts,
    memoryStatusFilter,
    moderationFilters,
    photoStatusCounts,
    photoStatusFilter,
    reportStatusCounts,
    reportStatusFilter,
    setActiveModerationSection,
    setActiveSection,
    setMemoryStatusFilter,
    setModerationFilters,
    setPhotoStatusFilter,
    setReportStatusFilter,
    visibleMemories,
    visibleReports,
  } = useAdminSectionState({
    memories,
    moderationCounts,
    reports,
  });
  const placeRefreshActions = useAdminPlaceRefreshActions({
    activeSection,
    adminToken,
    appConfig,
    refreshCategories,
    refreshMapPlaces,
    refreshModerationCounts,
    refreshPlaces,
  });
  const moderationRefreshActions = useAdminModerationRefreshActions({
    memoryStatusFilter,
    refreshMemories,
    refreshModerationCounts,
    refreshPlaces,
    refreshReports,
    reportStatusFilter,
  });
  const placeManagement = useAdminPlaceManagement({
    isSessionActive: Boolean(adminToken),
    onPhotosChanged: placeRefreshActions.refreshPhotosPlacesAndPublicPreview,
    onPlacesChanged: placeRefreshActions.refreshPlacesAndPublicPreview,
  });
  const cityActions = useCityActions({ cities, mapFallback: appConfig?.map ?? null, onChanged: refreshCities, places });

  function handlePhotoStatusFilterChange(status: typeof photoStatusFilter) {
    setPhotoStatusFilter(status);
  }

  function handleMemoryStatusFilterChange(status: typeof memoryStatusFilter) {
    setMemoryStatusFilter(status);
    refreshMemories(status).catch(() => undefined);
  }

  function handleReportStatusFilterChange(status: typeof reportStatusFilter) {
    setReportStatusFilter(status);
    refreshReports(status).catch(() => undefined);
  }

  if (!adminToken) {
    return (
      <>
        <AdminPlacesSEOHead />
        <AppShell activeSection="admin">
          <main className="page-shell admin-page">
            <AdminAccessGate
              message={accessMessage}
              onUnlocked={(token) => {
                placeManagement.clearOperationError();
                setAdminToken(token);
              }}
            />
          </main>
        </AppShell>
      </>
    );
  }

  if (!appConfig) {
    return (
      <>
        <AdminPlacesSEOHead />
        <AppShell
          activeSection="admin"
          adminAction={{ label: "Zmień token admina", onClick: clearSession, shortLabel: "A" }}
        >
          <main className="page-shell admin-page">
            <section className="ui-panel admin-load-panel" role="status">
              <p>Ładowanie konfiguracji panelu...</p>
            </section>
            {loadError ? (
              <AdminPlacesModalLayer
                appConfig={null}
                categories={categories}
                cities={cities}
                cityActions={cityActions}
                isCategoryManagerOpen={false}
                loadError={loadError}
                mapPlaces={mapPlaces}
                photoPreviewPlaceId={null}
                placeManagement={placeManagement}
                places={places}
                publicPreviewPlaceId={null}
                onCategoryManagerClose={() => setIsCategoryManagerOpen(false)}
                onCategoryManagerOpen={() => setIsCategoryManagerOpen(true)}
                onClearLoadError={clearLoadError}
                onPhotoPreviewPlaceIdChange={setPhotoPreviewPlaceId}
                onPublicPreviewPlaceIdChange={setPublicPreviewPlaceId}
                onRefreshCategories={refreshCategories}
                onRefreshPhotosAndPlaces={placeRefreshActions.refreshPhotosAndPlaces}
              />
            ) : null}
          </main>
        </AppShell>
      </>
    );
  }

  return (
    <>
      <AdminPlacesSEOHead />
      <AppShell
        activeSection="admin"
        adminAction={{ label: "Zmień token admina", onClick: clearSession, shortLabel: "A" }}
      >
        <main className="page-shell admin-page">
          <section className="admin-workspace">
            <AdminSectionTabs
              activeSection={activeSection}
              counts={{
                configuration: appConfig.place_custom_fields.length,
                guides: guides.length,
                moderation: photoStatusCounts.pending + memoryStatusCounts.pending + reportStatusCounts.open,
                places: places.length,
              }}
              onChange={setActiveSection}
            />

            {activeSection === "places" ? (
              <AdminPlacesSection
                categories={categories}
                cities={cities}
                editingPlaceId={placeManagement.editingPlace?.id ?? null}
                places={places}
                mapPlaces={mapPlaces}
                onArchive={placeManagement.requestArchivePlace}
                onArchiveCity={(city) => cityActions.setCityAction({ city, type: "archive" })}
                onCreate={() => {
                  setPhotoPreviewPlaceId(null);
                  setPublicPreviewPlaceId(null);
                  placeManagement.openCreatePlaceModal();
                }}
                onCreateCity={cityActions.openCreateCityModal}
                onDelete={(place) => {
                  setPhotoPreviewPlaceId(null);
                  setPublicPreviewPlaceId(null);
                  placeManagement.requestDeletePlace(place);
                }}
                onDeleteCity={(city) => cityActions.setCityAction({ city, type: "delete" })}
                onEdit={(place) => {
                  setPhotoPreviewPlaceId(null);
                  setPublicPreviewPlaceId(null);
                  placeManagement.openEditPlaceModal(place);
                }}
                onEditCity={cityActions.openEditCityModal}
                onManageCategories={() => setIsCategoryManagerOpen(true)}
                onPhotos={(place) => {
                  setPublicPreviewPlaceId(null);
                  setPhotoPreviewPlaceId(place.id);
                }}
                onPublicPreview={(place) => {
                  setPhotoPreviewPlaceId(null);
                  setPublicPreviewPlaceId(place.id);
                }}
              />
            ) : null}

            {activeSection === "moderation" ? (
              <AdminModerationSection
                activeSection={activeModerationSection}
                categories={categories}
                cities={cities}
                activeModerationFilterCount={activeModerationFilterCount}
                memories={visibleMemories}
                memoryStatusCounts={memoryStatusCounts}
                memoryStatusFilter={memoryStatusFilter}
                moderationFilters={moderationFilters}
                hasMoreMemories={hasMoreMemories}
                hasMoreReports={hasMoreReports}
                isLoadingMoreMemories={isLoadingMoreMemories}
                isLoadingMoreReports={isLoadingMoreReports}
                onLoadMoreMemories={() => loadMoreMemories(memoryStatusFilter)}
                onLoadMoreReports={() => loadMoreReports(reportStatusFilter)}
                photoStatusCounts={photoStatusCounts}
                photoStatusFilter={photoStatusFilter}
                places={places}
                reports={visibleReports}
                reportStatusCounts={reportStatusCounts}
                reportStatusFilter={reportStatusFilter}
                onMemoryReviewed={moderationRefreshActions.refreshMemoriesAndPlaces}
                onMemoryStatusFilterChange={handleMemoryStatusFilterChange}
                onModerationFiltersChange={setModerationFilters}
                onPhotoReviewed={moderationRefreshActions.refreshPhotosAndPlaces}
                onPhotoStatusFilterChange={handlePhotoStatusFilterChange}
                onReportChanged={moderationRefreshActions.refreshReportsAndModerationCounts}
                onReportStatusFilterChange={handleReportStatusFilterChange}
                onSectionChange={setActiveModerationSection}
              />
            ) : null}

            {activeSection === "guides" ? (
              <AdminGuidesSection cities={cities} guides={guides} places={places} onChanged={refreshGuides} />
            ) : null}

            {activeSection === "configuration" ? (
              <AdminConfigurationSection
                appConfig={appConfig}
                onPlacesChanged={refreshPlaces}
                onSaved={replaceAppConfig}
              />
            ) : null}
          </section>
          <AdminPlacesModalLayer
            appConfig={appConfig}
            categories={categories}
            cities={cities}
            cityActions={cityActions}
            isCategoryManagerOpen={isCategoryManagerOpen}
            loadError={loadError}
            mapPlaces={mapPlaces}
            photoPreviewPlaceId={photoPreviewPlaceId}
            placeManagement={placeManagement}
            places={places}
            publicPreviewPlaceId={publicPreviewPlaceId}
            onCategoryManagerClose={() => setIsCategoryManagerOpen(false)}
            onCategoryManagerOpen={() => setIsCategoryManagerOpen(true)}
            onClearLoadError={clearLoadError}
            onPhotoPreviewPlaceIdChange={(placeId) => {
              setPublicPreviewPlaceId(null);
              setPhotoPreviewPlaceId(placeId);
            }}
            onPublicPreviewPlaceIdChange={(placeId) => {
              setPhotoPreviewPlaceId(null);
              setPublicPreviewPlaceId(placeId);
            }}
            onRefreshCategories={placeRefreshActions.refreshCategoriesAndPublicPreview}
            onRefreshPhotosAndPlaces={placeRefreshActions.refreshPhotosPlacesAndPublicPreview}
          />
        </main>
      </AppShell>
    </>
  );
}
