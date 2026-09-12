import { useCallback, useRef, useState } from "react";

import { getAdminPhotoAlbums, getAdminPlacePhotos } from "../../api/media";
import type { AdminPhoto, AdminPhotoAlbum } from "../../api/types";
import { createLatestRequestGuard, type LatestRequestGuard } from "./latestRequestGuard";

type PhotoFilterOptions = NonNullable<Parameters<typeof getAdminPhotoAlbums>[0]>;

type Props = {
  filterOptions: PhotoFilterOptions;
  onError: (message: string) => void;
};

type Result = {
  albums: AdminPhotoAlbum[];
  isAlbumsLoading: boolean;
  loadAlbums: () => Promise<void>;
  loadPlacePhotos: (placeId: string) => Promise<void>;
  loadingPlaceIds: Set<string>;
  placePhotosById: Record<string, AdminPhoto[]>;
  resetPlacePhotos: () => void;
};

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

export function usePhotoQueueData({ filterOptions, onError }: Props): Result {
  const [albums, setAlbums] = useState<AdminPhotoAlbum[]>([]);
  const [isAlbumsLoading, setIsAlbumsLoading] = useState(false);
  const [loadingPlaceIds, setLoadingPlaceIds] = useState<Set<string>>(() => new Set());
  const [placePhotosById, setPlacePhotosById] = useState<Record<string, AdminPhoto[]>>({});
  const albumsRequestGuard = useRef<LatestRequestGuard>(createLatestRequestGuard());
  const placeRequestGuards = useRef(new Map<string, LatestRequestGuard>());

  const loadAlbums = useCallback(async () => {
    const guard = albumsRequestGuard.current;
    const token = guard.begin();
    setIsAlbumsLoading(true);
    try {
      const nextAlbums = await getAdminPhotoAlbums(filterOptions);
      if (guard.isCurrent(token)) {
        setAlbums(nextAlbums);
      }
    } catch (reason) {
      if (guard.isCurrent(token)) {
        onError(errorMessage(reason, "Nie udało się pobrać albumów zdjęć."));
      }
    } finally {
      if (guard.isCurrent(token)) {
        setIsAlbumsLoading(false);
      }
    }
  }, [filterOptions, onError]);

  const loadPlacePhotos = useCallback(
    async (placeId: string) => {
      let guard = placeRequestGuards.current.get(placeId);
      if (!guard) {
        guard = createLatestRequestGuard();
        placeRequestGuards.current.set(placeId, guard);
      }
      const token = guard.begin();
      setLoadingPlaceIds((currentIds) => new Set(currentIds).add(placeId));
      try {
        const nextPhotos = await getAdminPlacePhotos(placeId, filterOptions);
        if (guard.isCurrent(token)) {
          setPlacePhotosById((currentPhotos) => ({ ...currentPhotos, [placeId]: nextPhotos }));
        }
      } catch (reason) {
        if (guard.isCurrent(token)) {
          onError(errorMessage(reason, "Nie udało się pobrać zdjęć miejsca."));
        }
      } finally {
        if (guard.isCurrent(token)) {
          setLoadingPlaceIds((currentIds) => {
            const nextIds = new Set(currentIds);
            nextIds.delete(placeId);
            return nextIds;
          });
        }
      }
    },
    [filterOptions, onError],
  );

  const resetPlacePhotos = useCallback(() => {
    for (const guard of placeRequestGuards.current.values()) {
      guard.invalidate();
    }
    placeRequestGuards.current.clear();
    setLoadingPlaceIds(new Set());
    setPlacePhotosById({});
  }, []);

  return {
    albums,
    isAlbumsLoading,
    loadAlbums,
    loadPlacePhotos,
    loadingPlaceIds,
    placePhotosById,
    resetPlacePhotos,
  };
}
