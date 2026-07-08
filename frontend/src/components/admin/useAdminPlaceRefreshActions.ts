import { useCallback, useEffect, useMemo } from "react";

import type { AppConfig } from "../../api/types";
import type { AdminSection } from "./adminSections";
import { createAdminPlaceRefreshActions } from "./adminRefreshActions";

type Params = {
  activeSection: AdminSection;
  adminToken: string;
  appConfig: AppConfig | null;
  refreshCategories: () => Promise<void>;
  refreshMapPlaces: () => Promise<void>;
  refreshModerationCounts: () => Promise<void>;
  refreshPlaces: () => Promise<void>;
};

export function useAdminPlaceRefreshActions({
  activeSection,
  adminToken,
  appConfig,
  refreshCategories,
  refreshMapPlaces,
  refreshModerationCounts,
  refreshPlaces,
}: Params) {
  const actions = useMemo(
    () =>
      createAdminPlaceRefreshActions({
        refreshCategories,
        refreshMapPlaces,
        refreshModerationCounts,
        refreshPlaces,
      }),
    [refreshCategories, refreshMapPlaces, refreshModerationCounts, refreshPlaces],
  );

  const refreshPhotosAndPlaces = useCallback(() => actions.refreshPhotosAndPlaces(), [actions]);
  const refreshPhotosPlacesAndPublicPreview = useCallback(
    () => actions.refreshPhotosPlacesAndPublicPreview(),
    [actions],
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
