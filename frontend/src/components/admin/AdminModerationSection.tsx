import { Filter, ImagePlus } from "lucide-react";
import { useCallback, useState } from "react";

import type {
  AdminMemory,
  Category,
  City,
  Place,
  Report,
  ReportStatusCounts,
  ReportStatus,
  ReviewStatusCounts,
  ReviewStatus,
} from "../../api/types";
import type { AdminModerationSection as AdminModerationSectionKey } from "./adminSections";
import { AdminActionIconButton } from "./AdminActionIconButton";
import { AdminModerationFilterModal } from "./AdminModerationFilterModal";
import type { AdminModerationFilters } from "./adminModerationFilters";
import { AdminMemoriesSection } from "./AdminMemoriesSection";
import { AdminPhotosSection } from "./AdminPhotosSection";
import { AdminReportsSection } from "./AdminReportsSection";
import { AdminSegmentedControl } from "./AdminSegmentedControl";
import { AdminToolbar } from "./AdminToolbar";
import { ADMIN_MEDIA_STATUS_FILTERS } from "./adminMediaUi";
import { ADMIN_REPORT_STATUS_FILTERS } from "./adminStatusUi";
import { countModerationSections } from "./adminSectionState";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { SystemModal } from "./SystemModal";
import { usePhotoUploadModal } from "./usePhotoUploadModal";

type Props = {
  activeSection: AdminModerationSectionKey;
  activeModerationFilterCount: number;
  categories: Category[];
  cities: City[];
  hasMoreMemories: boolean;
  hasMoreReports: boolean;
  isLoadingMoreMemories: boolean;
  isLoadingMoreReports: boolean;
  memories: AdminMemory[];
  memoryStatusCounts: ReviewStatusCounts;
  memoryStatusFilter: ReviewStatus | "all";
  moderationFilters: AdminModerationFilters;
  onLoadMoreMemories: () => Promise<void>;
  onLoadMoreReports: () => Promise<void>;
  onMemoryReviewed: () => Promise<void>;
  onMemoryStatusFilterChange: (status: ReviewStatus | "all") => void;
  onModerationFiltersChange: (filters: AdminModerationFilters) => void;
  onPhotoReviewed: () => Promise<void>;
  onPhotoStatusFilterChange: (status: ReviewStatus | "all") => void;
  onReportChanged: () => Promise<void>;
  onReportStatusFilterChange: (status: ReportStatus | "all") => void;
  onSectionChange: (section: AdminModerationSectionKey) => void;
  photoStatusCounts: ReviewStatusCounts;
  photoStatusFilter: ReviewStatus | "all";
  places: Place[];
  reports: Report[];
  reportStatusCounts: ReportStatusCounts;
  reportStatusFilter: ReportStatus | "all";
};

export function AdminModerationSection({
  activeSection,
  activeModerationFilterCount,
  categories,
  cities,
  hasMoreMemories,
  hasMoreReports,
  isLoadingMoreMemories,
  isLoadingMoreReports,
  memories,
  memoryStatusCounts,
  memoryStatusFilter,
  moderationFilters,
  onLoadMoreMemories,
  onLoadMoreReports,
  onMemoryReviewed,
  onMemoryStatusFilterChange,
  onModerationFiltersChange,
  onPhotoReviewed,
  onPhotoStatusFilterChange,
  onReportChanged,
  onReportStatusFilterChange,
  onSectionChange,
  photoStatusCounts,
  photoStatusFilter,
  places,
  reports,
  reportStatusCounts,
  reportStatusFilter,
}: Props) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const handlePhotoChanged = useCallback(async () => {
    await onPhotoReviewed();
    setPhotoRefreshKey((currentKey) => currentKey + 1);
  }, [onPhotoReviewed]);
  const photoUpload = usePhotoUploadModal({
    onReviewed: handlePhotoChanged,
    setErrorMessage: setUploadErrorMessage,
  });
  const moderationSectionCounts = countModerationSections({
    memories: memoryStatusCounts,
    photos: photoStatusCounts,
    reports: reportStatusCounts,
  });
  const visibleModerationFilterCount =
    activeSection === "reports" && moderationFilters.audio !== "all"
      ? Math.max(0, activeModerationFilterCount - 1)
      : activeModerationFilterCount;
  const loadMore =
    activeSection === "reports"
      ? { hasMore: hasMoreReports, isLoading: isLoadingMoreReports, onClick: onLoadMoreReports }
      : activeSection === "memories"
        ? { hasMore: hasMoreMemories, isLoading: isLoadingMoreMemories, onClick: onLoadMoreMemories }
        : null;
  const activeStatusTabs =
    activeSection === "reports" ? (
      <AdminSegmentedControl
        activeKey={reportStatusFilter}
        ariaLabel="Status zgłoszeń"
        items={ADMIN_REPORT_STATUS_FILTERS.map((filter) => ({
          count: reportStatusCounts[filter.value],
          key: filter.value,
          label: filter.label,
        }))}
        onChange={onReportStatusFilterChange}
      />
    ) : activeSection === "memories" ? (
      <AdminSegmentedControl
        activeKey={memoryStatusFilter}
        ariaLabel="Status pamiątek"
        items={ADMIN_MEDIA_STATUS_FILTERS.map((filter) => ({
          count: memoryStatusCounts[filter.value],
          key: filter.value,
          label: filter.label,
        }))}
        onChange={onMemoryStatusFilterChange}
      />
    ) : (
      <AdminSegmentedControl
        activeKey={photoStatusFilter}
        ariaLabel="Status zdjęć"
        items={ADMIN_MEDIA_STATUS_FILTERS.map((filter) => ({
          count: photoStatusCounts[filter.value],
          key: filter.value,
          label: filter.label,
        }))}
        onChange={onPhotoStatusFilterChange}
      />
    );

  return (
    <section className="admin-section admin-section-single">
      <AdminToolbar
        primary={activeStatusTabs}
        secondary={
          <AdminSegmentedControl
            activeKey={activeSection}
            ariaLabel="Sekcje moderacji"
            items={[
              { count: moderationSectionCounts.photos, key: "photos", label: "Zdjęcia" },
              { count: moderationSectionCounts.memories, key: "memories", label: "Pamiątki" },
              { count: moderationSectionCounts.reports, key: "reports", label: "Zgłoszenia" },
            ]}
            onChange={onSectionChange}
          />
        }
        actions={{
          filter: (
            <AdminActionIconButton
              icon={Filter}
              label={
                visibleModerationFilterCount > 0
                  ? `Filtry moderacji, aktywne ${visibleModerationFilterCount}`
                  : "Filtry moderacji"
              }
              tone={visibleModerationFilterCount > 0 ? "primary" : "ghost"}
              onClick={() => setIsFilterModalOpen(true)}
            />
          ),
          primary:
            activeSection === "photos" ? (
              <AdminActionIconButton icon={ImagePlus} label="Dodaj zdjęcie" tone="primary" onClick={photoUpload.open} />
            ) : null,
        }}
      />

      {activeSection === "photos" ? (
        <AdminPhotosSection
          categories={categories}
          cities={cities}
          moderationFilters={moderationFilters}
          places={places}
          refreshKey={photoRefreshKey}
          statusFilter={photoStatusFilter}
          onChanged={handlePhotoChanged}
        />
      ) : null}

      {activeSection === "memories" ? (
        <AdminMemoriesSection
          categories={categories}
          cities={cities}
          memories={memories}
          places={places}
          onReviewed={onMemoryReviewed}
        />
      ) : null}

      {activeSection === "reports" ? <AdminReportsSection reports={reports} onChanged={onReportChanged} /> : null}
      {loadMore?.hasMore ? (
        <div className="admin-load-more">
          <button
            className="ui-button ui-button--secondary"
            type="button"
            disabled={loadMore.isLoading}
            onClick={loadMore.onClick}
          >
            {loadMore.isLoading ? "Ładowanie..." : "Pokaż więcej"}
          </button>
        </div>
      ) : null}
      {isFilterModalOpen ? (
        <AdminModerationFilterModal
          filters={moderationFilters}
          places={places}
          showAudioFilter={activeSection !== "reports"}
          onChange={onModerationFiltersChange}
          onClose={() => setIsFilterModalOpen(false)}
        />
      ) : null}
      {photoUpload.isOpen ? (
        <PhotoUploadModal
          audioFile={photoUpload.audioFile}
          audioError={photoUpload.audioError}
          attributionDraft={photoUpload.attributionDraft}
          canSubmit={photoUpload.canSubmit}
          caption={photoUpload.caption}
          cities={cities}
          cityId={photoUpload.cityId}
          descriptionBlocks={photoUpload.descriptionBlocks}
          file={photoUpload.file}
          inputKey={photoUpload.inputKey}
          isUploading={photoUpload.isUploading}
          placeId={photoUpload.placeId}
          places={places}
          onAddDescriptionBlock={photoUpload.addDescriptionBlock}
          onAudioFileChange={photoUpload.setAudioFile}
          onAttributionDraftChange={photoUpload.setAttributionDraft}
          onCaptionChange={photoUpload.setCaption}
          onCityChange={photoUpload.setCityId}
          onClose={photoUpload.close}
          onConfirm={photoUpload.submit}
          onFileChange={photoUpload.setFile}
          onPlaceChange={photoUpload.setPlaceId}
          onRemoveDescriptionBlock={photoUpload.removeDescriptionBlock}
          onUpdateDescriptionBlock={photoUpload.updateDescriptionBlock}
          onUpdateDescriptionBlockType={photoUpload.updateDescriptionBlockType}
        />
      ) : null}
      {uploadErrorMessage ? (
        <SystemModal
          confirmLabel="Rozumiem"
          message={uploadErrorMessage}
          title="Operacja nie powiodła się"
          tone="error"
          onClose={() => setUploadErrorMessage(null)}
        />
      ) : null}
    </section>
  );
}
