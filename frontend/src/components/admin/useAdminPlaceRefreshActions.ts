import { useCallback, useEffect, useMemo } from "react";

import type { AppConfig, ReviewStatus } from "../../api/types";
import type { AdminSection } from "./adminSections";
import { createAdminPlaceRefreshActions } from "./adminRefreshActions";

type Params = {
  activeSection: AdminSection;
  adminToken: string;
  appConfig: AppConfig | null;
  photoStatusFilter: ReviewStatus | "all";
  refreshCategories: () => Promise<void>;
  refreshMapPlaces: () => Promise<void>;
  refreshModerationCounts: () => Promise<void>;
  refreshPhotos: (status?: ReviewStatus | "all") => Promise<void>;
  refreshPlaces: () => Promise<void>;
};

export function useAdminPlaceRefreshActions({
  activeSection,
  adminToken,
  appConfig,
  photoStatusFilter,
  refreshCategories,
  refreshMapPlaces,
  refreshModerationCounts,
  refreshPhotos,
  refreshPlaces,
}: Params) {
  const actions = useMemo(
    () =>
      createAdminPlaceRefreshActions({
        refreshCategories,
        refreshMapPlaces,
        refreshModerationCounts,
        refreshPhotos,
        refreshPlaces,
      }),
    [refreshCategories, refreshMapPlaces, refreshModerationCounts, refreshPhotos, refreshPlaces],
  );

  const refreshPhotosAndPlaces = useCallback(
    () => actions.refreshPhotosAndPlaces(photoStatusFilter),
    [actions, photoStatusFilter],
  );
  const refreshPhotosPlacesAndPublicPreview = useCallback(
    () => actions.refreshPhotosPlacesAndPublicPreview(photoStatusFilter),
    [actions, photoStatusFilter],
  );

  useEffect(() => {
    if (!adminToken || !appConfig || activeSection !== "places") {
      return;
    }
    refreshMapPlaces().catch(() => undefined);
  }, [activeSection, adminToken, appConfig, refreshMapPlaces]);

  return {
    refreshCategoriesAndPublicPreview: actions.refreshCategoriesAndPublicPreview,
    refreshPhotosAndPlaces,
    refreshPhotosPlacesAndPublicPreview,
    refreshPlacesAndPublicPreview: actions.refreshPlacesAndPublicPreview,
  };
}
