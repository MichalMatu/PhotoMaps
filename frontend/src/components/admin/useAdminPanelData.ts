import { useCallback, useEffect, useState } from "react";

import { clearAdminToken, getStoredAdminToken } from "../../api/auth";
import { ApiError } from "../../api/http";
import type {
  AdminMemory,
  AdminModerationCounts,
  AdminPhoto,
  AdminPlace,
  AppConfig,
  Category,
  City,
  Guide,
  PlaceMapItem,
  Report,
  ReportStatus,
  ReviewStatus,
} from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import {
  useAdminGuideResources,
  useAdminModerationResources,
  useAdminPlaceResources,
  useAdminSettingsResources,
} from "./adminPanelResources";

type Result = {
  accessMessage: string | null;
  adminToken: string;
  appConfig: AppConfig | null;
  categories: Category[];
  cities: City[];
  clearLoadError: () => void;
  clearSession: () => void;
  guides: Guide[];
  hasMoreMemories: boolean;
  hasMorePhotos: boolean;
  hasMoreReports: boolean;
  isLoadingMoreMemories: boolean;
  isLoadingMorePhotos: boolean;
  isLoadingMoreReports: boolean;
  loadMoreMemories: (status?: ReviewStatus | "all") => Promise<void>;
  loadMorePhotos: (status?: ReviewStatus | "all") => Promise<void>;
  loadMoreReports: (status?: ReportStatus | "all") => Promise<void>;
  loadError: OperationError | null;
  mapPlaces: PlaceMapItem[];
  memories: AdminMemory[];
  moderationCounts: AdminModerationCounts;
  photos: AdminPhoto[];
  places: AdminPlace[];
  refreshCities: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshGuides: () => Promise<void>;
  refreshMemories: (status?: ReviewStatus | "all") => Promise<void>;
  refreshMapPlaces: () => Promise<void>;
  refreshModerationCounts: () => Promise<void>;
  refreshPhotos: (status?: ReviewStatus | "all") => Promise<void>;
  refreshPlaces: () => Promise<void>;
  refreshReports: (status?: ReportStatus | "all") => Promise<void>;
  reports: Report[];
  replaceAppConfig: (config: AppConfig) => void;
  setAdminToken: (token: string) => void;
};

function adminLoadError(reason: unknown): OperationError {
  return {
    details: errorDetails(reason),
    message: "Nie udało się pobrać danych panelu admina. Sprawdź backend i spróbuj ponownie.",
    title: "Nie udało się pobrać danych",
  };
}

export function useAdminPanelData(): Result {
  const [adminToken, setAdminToken] = useState(() => getStoredAdminToken());
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<OperationError | null>(null);
  const {
    appConfig,
    categories,
    cities,
    refreshAppConfig,
    refreshCategories,
    refreshCities,
    replaceAppConfig,
    resetSettings,
  } = useAdminSettingsResources();
  const { guides, refreshGuides, resetGuides } = useAdminGuideResources();
  const {
    mapPlaces,
    places,
    refreshMapPlaces: refreshMapPlacesResource,
    refreshPlaces,
    resetPlaces,
  } = useAdminPlaceResources(cities);
  const {
    hasMoreMemories,
    hasMorePhotos,
    hasMoreReports,
    isLoadingMoreMemories,
    isLoadingMorePhotos,
    isLoadingMoreReports,
    loadMoreMemories,
    loadMorePhotos,
    loadMoreReports,
    memories,
    moderationCounts,
    photos,
    refreshMemories,
    refreshModerationCounts,
    refreshPhotos,
    refreshReports,
    reports,
    resetModeration,
  } = useAdminModerationResources();

  const resetData = useCallback(() => {
    resetSettings();
    resetGuides();
    resetPlaces();
    resetModeration();
  }, [resetGuides, resetModeration, resetPlaces, resetSettings]);

  const clearSession = useCallback(() => {
    clearAdminToken();
    setAdminToken("");
    setAccessMessage(null);
    setLoadError(null);
    resetData();
  }, [resetData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshAppConfig(),
      refreshCategories(),
      refreshCities(),
      refreshGuides(),
      refreshMemories(),
      refreshModerationCounts(),
      refreshPlaces(),
      refreshPhotos(),
      refreshReports(),
    ]);
    setAccessMessage(null);
    setLoadError(null);
  }, [
    refreshAppConfig,
    refreshCategories,
    refreshCities,
    refreshGuides,
    refreshMemories,
    refreshModerationCounts,
    refreshPhotos,
    refreshPlaces,
    refreshReports,
  ]);

  const refreshMapPlaces = useCallback(async () => {
    try {
      await refreshMapPlacesResource();
    } catch (reason) {
      setLoadError(adminLoadError(reason));
      throw reason;
    }
  }, [refreshMapPlacesResource]);
  const refreshCitiesResult = useCallback(async () => {
    await refreshCities();
  }, [refreshCities]);
  const refreshCategoriesResult = useCallback(async () => {
    await refreshCategories();
  }, [refreshCategories]);
  const refreshGuidesResult = useCallback(async () => {
    await refreshGuides();
  }, [refreshGuides]);
  const refreshMemoriesResult = useCallback(
    async (status?: ReviewStatus | "all") => {
      try {
        await refreshMemories(status);
      } catch (reason) {
        setLoadError(adminLoadError(reason));
        throw reason;
      }
    },
    [refreshMemories],
  );
  const refreshModerationCountsResult = useCallback(async () => {
    try {
      await refreshModerationCounts();
    } catch (reason) {
      setLoadError(adminLoadError(reason));
      throw reason;
    }
  }, [refreshModerationCounts]);
  const refreshPhotosResult = useCallback(
    async (status?: ReviewStatus | "all") => {
      try {
        await refreshPhotos(status);
      } catch (reason) {
        setLoadError(adminLoadError(reason));
        throw reason;
      }
    },
    [refreshPhotos],
  );
  const refreshPlacesResult = useCallback(async () => {
    await refreshPlaces();
  }, [refreshPlaces]);
  const refreshReportsResult = useCallback(
    async (status?: ReportStatus | "all") => {
      try {
        await refreshReports(status);
      } catch (reason) {
        setLoadError(adminLoadError(reason));
        throw reason;
      }
    },
    [refreshReports],
  );
  const loadMorePhotosResult = useCallback(
    async (status?: ReviewStatus | "all") => {
      try {
        await loadMorePhotos(status);
      } catch (reason) {
        setLoadError(adminLoadError(reason));
        throw reason;
      }
    },
    [loadMorePhotos],
  );
  const loadMoreMemoriesResult = useCallback(
    async (status?: ReviewStatus | "all") => {
      try {
        await loadMoreMemories(status);
      } catch (reason) {
        setLoadError(adminLoadError(reason));
        throw reason;
      }
    },
    [loadMoreMemories],
  );
  const loadMoreReportsResult = useCallback(
    async (status?: ReportStatus | "all") => {
      try {
        await loadMoreReports(status);
      } catch (reason) {
        setLoadError(adminLoadError(reason));
        throw reason;
      }
    },
    [loadMoreReports],
  );

  useEffect(() => {
    if (!adminToken) {
      return;
    }

    refreshAll().catch((reason: unknown) => {
      if (reason instanceof ApiError && (reason.status === 401 || reason.status === 503)) {
        clearAdminToken();
        setAdminToken("");
        setAccessMessage(reason.message);
        setLoadError(null);
        resetData();
        return;
      }
      setLoadError(adminLoadError(reason));
    });
  }, [adminToken, refreshAll, resetData]);

  return {
    accessMessage,
    adminToken,
    appConfig,
    categories,
    cities,
    clearLoadError: () => setLoadError(null),
    clearSession,
    guides,
    hasMoreMemories,
    hasMorePhotos,
    hasMoreReports,
    isLoadingMoreMemories,
    isLoadingMorePhotos,
    isLoadingMoreReports,
    loadMoreMemories: loadMoreMemoriesResult,
    loadMorePhotos: loadMorePhotosResult,
    loadMoreReports: loadMoreReportsResult,
    loadError,
    mapPlaces,
    memories,
    moderationCounts,
    photos,
    places,
    refreshCities: refreshCitiesResult,
    refreshCategories: refreshCategoriesResult,
    refreshGuides: refreshGuidesResult,
    refreshMemories: refreshMemoriesResult,
    refreshMapPlaces,
    refreshModerationCounts: refreshModerationCountsResult,
    refreshPhotos: refreshPhotosResult,
    refreshPlaces: refreshPlacesResult,
    refreshReports: refreshReportsResult,
    reports,
    replaceAppConfig,
    setAdminToken: (token: string) => {
      setAccessMessage(null);
      setLoadError(null);
      setAdminToken(token);
    },
  };
}
