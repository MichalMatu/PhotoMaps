import type { ReportStatus, ReviewStatus } from "../../api/types";

type ReviewStatusFilter = ReviewStatus | "all";
type ReportStatusFilter = ReportStatus | "all";

type RefreshPromise = Promise<void>;

type PlaceRefreshDeps = {
  refreshCategories: () => RefreshPromise;
  refreshMapPlaces: () => RefreshPromise;
  refreshModerationCounts: () => RefreshPromise;
  refreshPhotos: (status?: ReviewStatusFilter) => RefreshPromise;
  refreshPlaces: () => RefreshPromise;
};

type ModerationRefreshDeps = {
  refreshMemories: (status?: ReviewStatusFilter) => RefreshPromise;
  refreshModerationCounts: () => RefreshPromise;
  refreshPhotos: (status?: ReviewStatusFilter) => RefreshPromise;
  refreshPlaces: () => RefreshPromise;
  refreshReports: (status?: ReportStatusFilter) => RefreshPromise;
};

export function createAdminPlaceRefreshActions({
  refreshCategories,
  refreshMapPlaces,
  refreshModerationCounts,
  refreshPhotos,
  refreshPlaces,
}: PlaceRefreshDeps) {
  return {
    async refreshCategoriesAndPublicPreview() {
      await Promise.all([refreshCategories(), refreshMapPlaces()]);
    },
    async refreshPhotosAndPlaces(status?: ReviewStatusFilter) {
      await Promise.all([refreshPhotos(status), refreshPlaces(), refreshModerationCounts()]);
    },
    async refreshPhotosPlacesAndPublicPreview(status?: ReviewStatusFilter) {
      await Promise.all([refreshPhotos(status), refreshPlaces(), refreshMapPlaces(), refreshModerationCounts()]);
    },
    async refreshPlacesAndPublicPreview() {
      await Promise.all([refreshPlaces(), refreshMapPlaces()]);
    },
  };
}

export function createAdminModerationRefreshActions({
  refreshMemories,
  refreshModerationCounts,
  refreshPhotos,
  refreshPlaces,
  refreshReports,
}: ModerationRefreshDeps) {
  return {
    async refreshMemoriesAndPlaces(status?: ReviewStatusFilter) {
      await Promise.all([refreshMemories(status), refreshPlaces(), refreshModerationCounts()]);
    },
    async refreshPhotosAndPlaces(status?: ReviewStatusFilter) {
      await Promise.all([refreshPhotos(status), refreshPlaces(), refreshModerationCounts()]);
    },
    async refreshReportsAndModerationCounts(status?: ReportStatusFilter) {
      await Promise.all([refreshReports(status), refreshModerationCounts()]);
    },
  };
}
