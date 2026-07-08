import type { ReportStatus, ReviewStatus } from "../../api/types";

type ReviewStatusFilter = ReviewStatus | "all";
type ReportStatusFilter = ReportStatus | "all";

type RefreshPromise = Promise<void>;

type PlaceRefreshDeps = {
  refreshCategories: () => RefreshPromise;
  refreshMapPlaces: () => RefreshPromise;
  refreshModerationCounts: () => RefreshPromise;
  refreshPlaces: () => RefreshPromise;
};

type ModerationRefreshDeps = {
  refreshMemories: (status?: ReviewStatusFilter) => RefreshPromise;
  refreshModerationCounts: () => RefreshPromise;
  refreshPlaces: () => RefreshPromise;
  refreshReports: (status?: ReportStatusFilter) => RefreshPromise;
};

export function createAdminPlaceRefreshActions({
  refreshCategories,
  refreshMapPlaces,
  refreshModerationCounts,
  refreshPlaces,
}: PlaceRefreshDeps) {
  return {
    async refreshCategoriesAndPublicPreview() {
      await Promise.all([refreshCategories(), refreshMapPlaces()]);
    },
    async refreshPhotosAndPlaces() {
      await Promise.all([refreshPlaces(), refreshModerationCounts()]);
    },
    async refreshPhotosPlacesAndPublicPreview() {
      await Promise.all([refreshPlaces(), refreshMapPlaces(), refreshModerationCounts()]);
    },
    async refreshPlacesAndPublicPreview() {
      await Promise.all([refreshPlaces(), refreshMapPlaces()]);
    },
  };
}

export function createAdminModerationRefreshActions({
  refreshMemories,
  refreshModerationCounts,
  refreshPlaces,
  refreshReports,
}: ModerationRefreshDeps) {
  return {
    async refreshMemoriesAndPlaces(status?: ReviewStatusFilter) {
      await Promise.all([refreshMemories(status), refreshPlaces(), refreshModerationCounts()]);
    },
    async refreshPhotosAndPlaces() {
      await Promise.all([refreshPlaces(), refreshModerationCounts()]);
    },
    async refreshReportsAndModerationCounts(status?: ReportStatusFilter) {
      await Promise.all([refreshReports(status), refreshModerationCounts()]);
    },
  };
}
