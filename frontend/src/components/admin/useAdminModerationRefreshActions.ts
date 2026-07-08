import { useCallback, useMemo } from "react";

import type { ReportStatus, ReviewStatus } from "../../api/types";
import { createAdminModerationRefreshActions } from "./adminRefreshActions";

type Params = {
  memoryStatusFilter: ReviewStatus | "all";
  refreshMemories: (status?: ReviewStatus | "all") => Promise<void>;
  refreshModerationCounts: () => Promise<void>;
  refreshPlaces: () => Promise<void>;
  refreshReports: (status?: ReportStatus | "all") => Promise<void>;
  reportStatusFilter: ReportStatus | "all";
};

export function useAdminModerationRefreshActions({
  memoryStatusFilter,
  refreshMemories,
  refreshModerationCounts,
  refreshPlaces,
  refreshReports,
  reportStatusFilter,
}: Params) {
  const actions = useMemo(
    () =>
      createAdminModerationRefreshActions({
        refreshMemories,
        refreshModerationCounts,
        refreshPlaces,
        refreshReports,
      }),
    [refreshMemories, refreshModerationCounts, refreshPlaces, refreshReports],
  );

  const refreshMemoriesAndPlaces = useCallback(
    () => actions.refreshMemoriesAndPlaces(memoryStatusFilter),
    [actions, memoryStatusFilter],
  );
  const refreshPhotosAndPlaces = useCallback(() => actions.refreshPhotosAndPlaces(), [actions]);
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
