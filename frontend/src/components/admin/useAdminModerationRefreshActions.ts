import { useCallback, useMemo } from "react";

import type { ReportStatus, ReviewStatus } from "../../api/types";
import { createAdminModerationRefreshActions } from "./adminRefreshActions";

type Params = {
  memoryStatusFilter: ReviewStatus | "all";
  photoStatusFilter: ReviewStatus | "all";
  refreshMemories: (status?: ReviewStatus | "all") => Promise<void>;
  refreshModerationCounts: () => Promise<void>;
  refreshPhotos: (status?: ReviewStatus | "all") => Promise<void>;
  refreshPlaces: () => Promise<void>;
  refreshReports: (status?: ReportStatus | "all") => Promise<void>;
  reportStatusFilter: ReportStatus | "all";
};

export function useAdminModerationRefreshActions({
  memoryStatusFilter,
  photoStatusFilter,
  refreshMemories,
  refreshModerationCounts,
  refreshPhotos,
  refreshPlaces,
  refreshReports,
  reportStatusFilter,
}: Params) {
  const actions = useMemo(
    () =>
      createAdminModerationRefreshActions({
        refreshMemories,
        refreshModerationCounts,
        refreshPhotos,
        refreshPlaces,
        refreshReports,
      }),
    [refreshMemories, refreshModerationCounts, refreshPhotos, refreshPlaces, refreshReports],
  );

  const refreshMemoriesAndPlaces = useCallback(
    () => actions.refreshMemoriesAndPlaces(memoryStatusFilter),
    [actions, memoryStatusFilter],
  );
  const refreshPhotosAndPlaces = useCallback(
    () => actions.refreshPhotosAndPlaces(photoStatusFilter),
    [actions, photoStatusFilter],
  );
  const refreshReportsAndModerationCounts = useCallback(
    () => actions.refreshReportsAndModerationCounts(reportStatusFilter),
    [actions, reportStatusFilter],
  );

  return {
    refreshMemoriesAndPlaces,
    refreshPhotosAndPlaces,
    refreshReportsAndModerationCounts,
  };
}
