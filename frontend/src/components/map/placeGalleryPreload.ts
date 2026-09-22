import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { mediaUrl } from "../../api/http";
import type { Photo, PlaceMapItem } from "../../api/types";
import { MediaPreloadScheduler, type MediaPreloadPriority } from "./mediaPreloadScheduler";
import { placeGalleryQueryOptions } from "./placeGalleryQuery";
import { getPlaceGalleryItems, getPlacePreviewVisual, type PlaceMapVisualItem } from "./placePreview";

type ActiveMediaPreload = {
  image: HTMLImageElement;
  promise: Promise<void>;
};

const loadedMediaUrls = new Set<string>();
const activeMediaPreloads = new Map<string, ActiveMediaPreload>();

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

function preloadMediaPath(path: string, priority: MediaPreloadPriority): Promise<void> {
  if (typeof Image === "undefined") {
    return Promise.resolve();
  }

  const url = mediaUrl(path);
  if (loadedMediaUrls.has(url)) {
    return Promise.resolve();
  }

  const activePreload = activeMediaPreloads.get(url);
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
      activeMediaPreloads.delete(url);
      if (loaded) {
        loadedMediaUrls.add(url);
      }
      resolve();
    };

    image.addEventListener("load", () => settle(true), { once: true });
    image.addEventListener("error", () => settle(false), { once: true });
  });

  activeMediaPreloads.set(url, { image, promise });
  image.src = url;
  return promise;
}

function scheduleBrowserIdle(callback: () => void): void {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => callback());
    return;
  }
  if (typeof window !== "undefined") {
    window.setTimeout(callback, 200);
    return;
  }
  callback();
}

function waitForBrowserIdle(): Promise<void> {
  return new Promise((resolve) => scheduleBrowserIdle(resolve));
}

function userRequestedReducedData(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

const mediaPreloadScheduler = new MediaPreloadScheduler(preloadMediaPath, scheduleBrowserIdle, 2);

export function usePlaceGalleryPreloadControls() {
  const queryClient = useQueryClient();

  const prefetchPlaceGallery = useCallback(
    (place: PlaceMapItem) => {
      void queryClient.prefetchQuery(placeGalleryQueryOptions(place.id));
    },
    [queryClient],
  );

  const prioritizePlaceGallery = useCallback(
    (place: PlaceMapItem) => {
      void mediaPreloadScheduler
        .runInteractive(async () => {
          const photos = await queryClient.fetchQuery(placeGalleryQueryOptions(place.id));
          await Promise.all(galleryThumbPaths(place, photos).map((path) => preloadMediaPath(path, "high")));
        })
        .catch(() => undefined);
    },
    [queryClient],
  );

  const prioritizeMediaItem = useCallback((item: Pick<PlaceMapVisualItem, "public_path">) => {
    void mediaPreloadScheduler.prioritize([item.public_path]).catch(() => undefined);
  }, []);

  return { prefetchPlaceGallery, prioritizeMediaItem, prioritizePlaceGallery };
}

export function useVisiblePlaceGalleriesPreload(places: PlaceMapItem[]): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (places.length === 0 || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    mediaPreloadScheduler.clearBackgroundQueue();
    const primaryThumbPaths = visiblePlaceCoverThumbPaths(places);
    const primaryThumbPathSet = new Set(primaryThumbPaths);

    const preloadInPriorityOrder = async () => {
      await mediaPreloadScheduler.prioritize(primaryThumbPaths);
      if (cancelled || userRequestedReducedData()) {
        return;
      }

      for (const place of places) {
        await mediaPreloadScheduler.waitForInteractiveIdle();
        await waitForBrowserIdle();
        if (cancelled) {
          return;
        }

        try {
          const photos = await queryClient.fetchQuery(placeGalleryQueryOptions(place.id));
          if (cancelled) {
            return;
          }
          const backgroundThumbPaths = galleryThumbPaths(place, photos).filter(
            (path) => !primaryThumbPathSet.has(path),
          );
          mediaPreloadScheduler.enqueueBackground(backgroundThumbPaths);
        } catch {
          // Background warming is best effort. User-driven queries still surface their own errors.
        }
      }
    };

    void preloadInPriorityOrder();
    return () => {
      cancelled = true;
      mediaPreloadScheduler.clearBackgroundQueue();
    };
  }, [places, queryClient]);
}
