import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { mediaUrl } from "../../api/http";
import type { Photo, PlaceMapItem } from "../../api/types";
import { placeGalleryQueryOptions } from "./placeGalleryQuery";
import { getPlaceGalleryItems, type PlaceMapVisualItem } from "./placePreview";

const loadedThumbnailUrls = new Set<string>();
const activeThumbnailPreloads = new Map<string, HTMLImageElement>();

export function uniqueGalleryThumbPaths(items: Array<Pick<PlaceMapVisualItem, "thumb_path">>): string[] {
  return [...new Set(items.map((item) => item.thumb_path).filter(Boolean))];
}

function galleryThumbPaths(place: PlaceMapItem, photos: Photo[]): string[] {
  return uniqueGalleryThumbPaths(getPlaceGalleryItems(place, photos));
}

function preloadGalleryThumbPaths(paths: string[]): void {
  if (typeof Image === "undefined") {
    return;
  }

  for (const path of paths) {
    const url = mediaUrl(path);
    if (loadedThumbnailUrls.has(url) || activeThumbnailPreloads.has(url)) {
      continue;
    }

    const image = new Image();
    activeThumbnailPreloads.set(url, image);

    image.addEventListener(
      "load",
      () => {
        activeThumbnailPreloads.delete(url);
        loadedThumbnailUrls.add(url);
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        activeThumbnailPreloads.delete(url);
      },
      { once: true },
    );
    image.src = url;
  }
}

async function preloadPlaceGallery(queryClient: QueryClient, place: PlaceMapItem): Promise<void> {
  const photos = await queryClient.fetchQuery(placeGalleryQueryOptions(place.id));
  preloadGalleryThumbPaths(galleryThumbPaths(place, photos));
}

function preloadPlaceGallerySafely(queryClient: QueryClient, place: PlaceMapItem): void {
  void preloadPlaceGallery(queryClient, place).catch(() => undefined);
}

export function usePlaceGalleryPrefetch() {
  const queryClient = useQueryClient();

  return useCallback(
    (place: PlaceMapItem) => {
      preloadPlaceGallerySafely(queryClient, place);
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
    const preloadVisibleGalleries = () => {
      if (cancelled) {
        return;
      }
      for (const place of places) {
        preloadPlaceGallerySafely(queryClient, place);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(preloadVisibleGalleries, { timeout: 800 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleCallbackId);
      };
    }

    const timeoutId = window.setTimeout(preloadVisibleGalleries, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [places, queryClient]);
}
