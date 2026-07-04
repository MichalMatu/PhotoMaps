import { useCallback, useState } from "react";

import { getAdminAppConfig } from "../../api/appConfig";
import { getAdminCategories } from "../../api/categories";
import { getAdminCities } from "../../api/cities";
import { getAdminGuides } from "../../api/guides";
import { getAdminMemories, getAdminPhotos } from "../../api/media";
import { getAdminModerationCounts } from "../../api/moderation";
import { getAdminPlaces, getMapPlacesForCities } from "../../api/places";
import { getAdminReports } from "../../api/reports";
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

const ADMIN_QUEUE_PAGE_SIZE = 100;

type AdminResource<T> = {
  refresh: () => Promise<T>;
  reset: () => void;
  setValue: (value: T) => void;
  value: T;
};

type AdminQueueStatus = string;

type AdminPagedResource<T, TStatus extends AdminQueueStatus> = AdminResource<T[]> & {
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMore: (status?: TStatus | "all") => Promise<T[]>;
  refresh: (status?: TStatus | "all") => Promise<T[]>;
};

const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_CITIES: City[] = [];
const EMPTY_GUIDES: Guide[] = [];
const EMPTY_MAP_PLACES: PlaceMapItem[] = [];
const EMPTY_PLACES: AdminPlace[] = [];
const EMPTY_REVIEW_STATUS_COUNTS = { all: 0, approved: 0, pending: 0, rejected: 0 };
const EMPTY_REPORT_STATUS_COUNTS = { all: 0, closed: 0, open: 0 };
const EMPTY_MODERATION_COUNTS: AdminModerationCounts = {
  memories: EMPTY_REVIEW_STATUS_COUNTS,
  photos: EMPTY_REVIEW_STATUS_COUNTS,
  reports: EMPTY_REPORT_STATUS_COUNTS,
};

function useAdminResource<T>(initialValue: T, load: () => Promise<T>): AdminResource<T> {
  const [value, setValue] = useState<T>(initialValue);
  const refresh = useCallback(async () => {
    const nextValue = await load();
    setValue(nextValue);
    return nextValue;
  }, [load]);
  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  return { refresh, reset, setValue, value };
}

function useAdminPagedResource<T, TStatus extends AdminQueueStatus>(
  load: (options: { limit: number; offset: number; status?: TStatus }) => Promise<T[]>,
): AdminPagedResource<T, TStatus> {
  const [value, setValue] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const refresh = useCallback(
    async (status?: TStatus | "all") => {
      const nextValue = await load({
        limit: ADMIN_QUEUE_PAGE_SIZE,
        offset: 0,
        status: status && status !== "all" ? status : undefined,
      });
      setValue(nextValue);
      setHasMore(nextValue.length === ADMIN_QUEUE_PAGE_SIZE);
      return nextValue;
    },
    [load],
  );
  const loadMore = useCallback(
    async (status?: TStatus | "all") => {
      setIsLoadingMore(true);
      try {
        const nextPage = await load({
          limit: ADMIN_QUEUE_PAGE_SIZE,
          offset: value.length,
          status: status && status !== "all" ? status : undefined,
        });
        const nextValue = [...value, ...nextPage];
        setValue(nextValue);
        setHasMore(nextPage.length === ADMIN_QUEUE_PAGE_SIZE);
        return nextValue;
      } finally {
        setIsLoadingMore(false);
      }
    },
    [load, value],
  );
  const reset = useCallback(() => {
    setValue([]);
    setHasMore(false);
    setIsLoadingMore(false);
  }, []);

  return { hasMore, isLoadingMore, loadMore, refresh, reset, setValue, value };
}

export function useAdminSettingsResources() {
  const {
    refresh: refreshAppConfig,
    reset: resetAppConfig,
    setValue: replaceAppConfig,
    value: appConfig,
  } = useAdminResource<AppConfig | null>(null, getAdminAppConfig);
  const {
    refresh: refreshCategories,
    reset: resetCategories,
    value: categories,
  } = useAdminResource<Category[]>(EMPTY_CATEGORIES, getAdminCategories);
  const {
    refresh: refreshCities,
    reset: resetCities,
    value: cities,
  } = useAdminResource<City[]>(EMPTY_CITIES, getAdminCities);
  const resetSettings = useCallback(() => {
    resetAppConfig();
    resetCategories();
    resetCities();
  }, [resetAppConfig, resetCategories, resetCities]);

  return {
    appConfig,
    categories,
    cities,
    refreshAppConfig,
    refreshCategories,
    refreshCities,
    replaceAppConfig,
    resetSettings,
  };
}

export function useAdminPlaceResources(cities: City[]) {
  const loadMapPlaces = useCallback(() => getMapPlacesForCities(cities), [cities]);
  const {
    refresh: refreshPlaces,
    reset: resetAdminPlaces,
    value: places,
  } = useAdminResource<AdminPlace[]>(EMPTY_PLACES, getAdminPlaces);
  const {
    refresh: refreshMapPlaces,
    reset: resetMapPlaces,
    value: mapPlaces,
  } = useAdminResource<PlaceMapItem[]>(EMPTY_MAP_PLACES, loadMapPlaces);
  const resetPlaces = useCallback(() => {
    resetAdminPlaces();
    resetMapPlaces();
  }, [resetAdminPlaces, resetMapPlaces]);

  return {
    mapPlaces,
    places,
    refreshMapPlaces,
    refreshPlaces,
    resetPlaces,
  };
}

export function useAdminModerationResources() {
  const {
    refresh: refreshModerationCounts,
    reset: resetModerationCounts,
    value: moderationCounts,
  } = useAdminResource<AdminModerationCounts>(EMPTY_MODERATION_COUNTS, getAdminModerationCounts);
  const {
    hasMore: hasMoreMemories,
    isLoadingMore: isLoadingMoreMemories,
    loadMore: loadMoreMemories,
    refresh: refreshMemories,
    reset: resetMemories,
    value: memories,
  } = useAdminPagedResource<AdminMemory, ReviewStatus>(getAdminMemories);
  const {
    hasMore: hasMorePhotos,
    isLoadingMore: isLoadingMorePhotos,
    loadMore: loadMorePhotos,
    refresh: refreshPhotos,
    reset: resetPhotos,
    value: photos,
  } = useAdminPagedResource<AdminPhoto, ReviewStatus>(getAdminPhotos);
  const {
    hasMore: hasMoreReports,
    isLoadingMore: isLoadingMoreReports,
    loadMore: loadMoreReports,
    refresh: refreshReports,
    reset: resetReports,
    value: reports,
  } = useAdminPagedResource<Report, ReportStatus>(getAdminReports);
  const resetModeration = useCallback(() => {
    resetModerationCounts();
    resetMemories();
    resetPhotos();
    resetReports();
  }, [resetMemories, resetModerationCounts, resetPhotos, resetReports]);

  return {
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
  };
}

export function useAdminGuideResources() {
  const {
    refresh: refreshGuides,
    reset: resetGuides,
    value: guides,
  } = useAdminResource<Guide[]>(EMPTY_GUIDES, getAdminGuides);

  return {
    guides,
    refreshGuides,
    resetGuides,
  };
}
