import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { mediaUrl } from "../../api/http";
import type { Photo, PlaceMapItem } from "../../api/types";
import { placeGalleryQueryOptions } from "./placeGalleryQuery";
import { getPlaceGalleryItems, getPlacePreviewVisual, type PlaceMapVisualItem } from "./placePreview";

type ThumbnailFetchPriority = "high" | "low";

type ActiveThumbnailPreload = {
  image: HTMLImageElement;
  promise: Promise<void>;
};

const loadedThumbnailUrls = new Set<string>();
const activeThumbnailPreloads = new Map<string, ActiveThumbnailPreload>();

export function uniqueGalleryThumbPaths(items: Array<Pick<PlaceMapVisualItem, "thumb_path">>): string[] {
  return [...new Set(items.map((item) => item.thumb_path).filter(Boolean))];
}

export function visiblePlaceCoverThumbPaths(
  places: Array<Pick<PlaceMapItem, "cover_photo" | "preview_items">>,
): string[] {
  return uniqueGalleryThumbPaths(
    places.map((place) => getPlacePreviewVisual(place)).filter((item): item is PlaceMapVisualItem => Boolean(item)),
  );
}

function galleryThumbPaths(place: PlaceMapItem, photos: Photo[]): string[] {
  return uniqueGalleryThumbPaths(getPlaceGalleryItems(place, photos));
}

function preloadThumbnailPath(path: string, priority: ThumbnailFetchPriority): Promise<void> {
  if (typeof Image === "undefined") {
    return Promise.resolve();
  }

  const url = mediaUrl(path);
  if (loadedThumbnailUrls.has(url)) {
    return Promise.resolve();
  }

  const activePreload = activeThumbnailPreloads.get(url);
  if (activePreload) {
    if (priority === "high") {
      activePreload.image.fetchPriority = "high";
    }
    return activePreload.promise;
  }

  const image = new Image();
  image.fetchPriority = priority;
  image.decoding = "async";

  const promise = new Promise<void>((resolve) => {
    const settle = (loaded: boolean) => {
      activeThumbnailPreloads.delete(url);
      if (loaded) {
        loadedThumbnailUrls.add(url);
      }
      resolve();
    };

    image.addEventListener("load", () => settle(true), { once: true });
    image.addEventListener("error", () => settle(false), { once: true });
  });

  activeThumbnailPreloads.set(url, { image, promise });
  image.src = url;
  return promise;
}

async function preloadThumbnailPaths(paths: string[], priority: ThumbnailFetchPriority): Promise<void> {
  await Promise.all(paths.map((path) => preloadThumbnailPath(path, priority)));
}

async function preloadPlaceGalleryThumbs(
  queryClient: QueryClient,
  place: PlaceMapItem,
  primaryThumbPaths: ReadonlySet<string>,
): Promise<void> {
  const photos = await queryClient.fetchQuery(placeGalleryQueryOptions(place.id));
  const backgroundThumbPaths = galleryThumbPaths(place, photos).filter((path) => !primaryThumbPaths.has(path));
  await preloadThumbnailPaths(backgroundThumbPaths, "low");
}

function preloadPlaceGalleryThumbsSafely(
  queryClient: QueryClient,
  place: PlaceMapItem,
  primaryThumbPaths: ReadonlySet<string>,
): void {
  void preloadPlaceGalleryThumbs(queryClient, place, primaryThumbPaths).catch(() => undefined);
}

export function usePlaceGalleryPrefetch() {
  const queryClient = useQueryClient();

  return useCallback(
    (place: PlaceMapItem) => {
      void queryClient.prefetchQuery(placeGalleryQueryOptions(place.id));
    },
    [queryClient],
  );
}

export function useVisiblePlaceGalleriesPreload(places: PlaceMapItem[]): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (places.length === 0 || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    const primaryThumbPaths = visiblePlaceCoverThumbPaths(places);
    const primaryThumbPathSet = new Set(primaryThumbPaths);

    const preloadInPriorityOrder = async () => {
      await preloadThumbnailPaths(primaryThumbPaths, "high");
      if (cancelled) {
        return;
      }

      for (const place of places) {
        preloadPlaceGalleryThumbsSafely(queryClient, place, primaryThumbPathSet);
      }
    };

    void preloadInPriorityOrder();
    return () => {
      cancelled = true;
    };
  }, [places, queryClient]);
}
