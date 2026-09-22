from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

preload_path = ROOT / "frontend/src/components/map/placeGalleryPreload.ts"
preload_path.write_text('''import type { QueryClient } from "@tanstack/react-query";
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
''', encoding="utf-8")

test_path = ROOT / "frontend/src/components/map/placeGalleryPreload.test.ts"
test_path.write_text('''import { describe, expect, it } from "vitest";

import { uniqueGalleryThumbPaths, visiblePlaceCoverThumbPaths } from "./placeGalleryPreload";

describe("gallery thumbnail preload helpers", () => {
  it("deduplicates gallery thumbnails while preserving order", () => {
    expect(
      uniqueGalleryThumbPaths([
        { thumb_path: "/media/a-thumb.jpg" },
        { thumb_path: "/media/b-thumb.jpg" },
        { thumb_path: "/media/a-thumb.jpg" },
      ]),
    ).toEqual(["/media/a-thumb.jpg", "/media/b-thumb.jpg"]);
  });

  it("extracts and deduplicates only the primary visible-place cover thumbnails", () => {
    const previewItem = (id: string, thumbPath: string) => ({
      kind: "photo" as const,
      id,
      public_path: `/media/${id}.jpg`,
      thumb_path: thumbPath,
      caption: null,
      audio: null,
      attribution_author: null,
      attribution_source_url: null,
      attribution_license: null,
      attribution_license_url: null,
    });

    expect(
      visiblePlaceCoverThumbPaths([
        { cover_photo: previewItem("cover-a", "/media/a-thumb.jpg"), preview_items: [] },
        { cover_photo: previewItem("cover-b", "/media/b-thumb.jpg"), preview_items: [] },
        { cover_photo: previewItem("cover-a-duplicate", "/media/a-thumb.jpg"), preview_items: [] },
      ]),
    ).toEqual(["/media/a-thumb.jpg", "/media/b-thumb.jpg"]);
  });
});
''', encoding="utf-8")
