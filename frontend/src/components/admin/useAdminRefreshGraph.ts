import { useCallback, useEffect } from "react";

import type { AppConfig, ReportStatus, ReviewStatus } from "../../api/types";
import type { AdminSection } from "./adminSections";

type Params = {
  activeSection: AdminSection;
  adminToken: string;
  appConfig: AppConfig | null;
  refreshCategories: () => Promise<void>;
  refreshMapPlaces: () => Promise<void>;
  refreshMemories: (status?: ReviewStatus | "all") => Promise<void>;
  refreshModerationCounts: () => Promise<void>;
  refreshPhotos: (status?: ReviewStatus | "all") => Promise<void>;
  refreshPlaces: () => Promise<void>;
  refreshReports: (status?: ReportStatus | "all") => Promise<void>;
};

export function useAdminRefreshGraph({
  activeSection,
  adminToken,
  appConfig,
  refreshCategories,
  refreshMapPlaces,
  refreshMemories,
  refreshModerationCounts,
  refreshPhotos,
  refreshPlaces,
  refreshReports,
}: Params) {
  const refreshPhotosAndPlaces = useCallback(
    async (status?: ReviewStatus | "all") => {
      await Promise.all([refreshPhotos(status), refreshPlaces(), refreshModerationCounts()]);
    },
    [refreshModerationCounts, refreshPhotos, refreshPlaces],
  );

  const refreshMemoriesAndPlaces = useCallback(
    async (status?: ReviewStatus | "all") => {
      await Promise.all([refreshMemories(status), refreshPlaces(), refreshModerationCounts()]);
    },
    [refreshMemories, refreshModerationCounts, refreshPlaces],
  );

  const refreshReportsAndModerationCounts = useCallback(
    async (status?: ReportStatus | "all") => {
      await Promise.all([refreshReports(status), refreshModerationCounts()]);
    },
    [refreshModerationCounts, refreshReports],
  );

  const refreshPlacesAndPublicPreview = useCallback(async () => {
    await Promise.all([refreshPlaces(), refreshMapPlaces()]);
  }, [refreshMapPlaces, refreshPlaces]);

  const refreshPhotosPlacesAndPublicPreview = useCallback(
    async (status?: ReviewStatus | "all") => {
      await Promise.all([refreshPhotos(status), refreshPlaces(), refreshMapPlaces(), refreshModerationCounts()]);
    },
    [refreshMapPlaces, refreshModerationCounts, refreshPhotos, refreshPlaces],
  );

  const refreshCategoriesAndPublicPreview = useCallback(async () => {
    await Promise.all([refreshCategories(), refreshMapPlaces()]);
  }, [refreshCategories, refreshMapPlaces]);

  useEffect(() => {
    if (!adminToken || !appConfig || activeSection !== "places") {
      return;
    }
    refreshMapPlaces().catch(() => undefined);
  }, [activeSection, adminToken, appConfig, refreshMapPlaces]);

  return {
    refreshCategoriesAndPublicPreview,
    refreshMemoriesAndPlaces,
    refreshPhotosAndPlaces,
    refreshPhotosPlacesAndPublicPreview,
    refreshPlacesAndPublicPreview,
    refreshReportsAndModerationCounts,
  };
}
