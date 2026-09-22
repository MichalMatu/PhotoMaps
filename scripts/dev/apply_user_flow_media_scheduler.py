from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

(ROOT / "frontend/src/components/map/mediaPreloadScheduler.ts").write_text(r'''export type MediaPreloadPriority = "high" | "low";

type LoadMedia = (path: string, priority: MediaPreloadPriority) => Promise<void>;
type ScheduleIdle = (callback: () => void) => void;

export class MediaPreloadScheduler {
  private backgroundInFlight = 0;
  private backgroundQueue: string[] = [];
  private backgroundQueued = new Set<string>();
  private idlePumpScheduled = false;
  private interactiveLoads = 0;
  private interactiveIdleWaiters: Array<() => void> = [];

  constructor(
    private readonly loadMedia: LoadMedia,
    private readonly scheduleIdle: ScheduleIdle,
    private readonly backgroundConcurrency = 2,
  ) {}

  clearBackgroundQueue(): void {
    this.backgroundQueue = [];
    this.backgroundQueued.clear();
  }

  enqueueBackground(paths: string[]): void {
    for (const path of paths) {
      if (!path || this.backgroundQueued.has(path)) {
        continue;
      }
      this.backgroundQueue.push(path);
      this.backgroundQueued.add(path);
    }
    this.scheduleBackgroundPump();
  }

  async prioritize(paths: string[]): Promise<void> {
    const uniquePaths = [...new Set(paths.filter(Boolean))];
    if (uniquePaths.length === 0) {
      return;
    }

    const prioritized = new Set(uniquePaths);
    this.backgroundQueue = this.backgroundQueue.filter((path) => !prioritized.has(path));
    for (const path of prioritized) {
      this.backgroundQueued.delete(path);
    }

    await this.runInteractive(async () => {
      await Promise.all(uniquePaths.map((path) => this.loadMedia(path, "high")));
    });
  }

  async runInteractive<T>(task: () => Promise<T>): Promise<T> {
    this.interactiveLoads += 1;
    try {
      return await task();
    } finally {
      this.interactiveLoads -= 1;
      if (this.interactiveLoads === 0) {
        const waiters = this.interactiveIdleWaiters.splice(0);
        for (const resolve of waiters) {
          resolve();
        }
        this.scheduleBackgroundPump();
      }
    }
  }

  waitForInteractiveIdle(): Promise<void> {
    if (this.interactiveLoads === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => this.interactiveIdleWaiters.push(resolve));
  }

  private scheduleBackgroundPump(): void {
    if (
      this.idlePumpScheduled ||
      this.interactiveLoads > 0 ||
      this.backgroundInFlight >= this.backgroundConcurrency ||
      this.backgroundQueue.length === 0
    ) {
      return;
    }

    this.idlePumpScheduled = true;
    this.scheduleIdle(() => {
      this.idlePumpScheduled = false;
      this.pumpBackgroundQueue();
    });
  }

  private pumpBackgroundQueue(): void {
    if (this.interactiveLoads > 0) {
      return;
    }

    while (this.backgroundInFlight < this.backgroundConcurrency && this.backgroundQueue.length > 0) {
      const path = this.backgroundQueue.shift();
      if (!path) {
        break;
      }
      this.backgroundQueued.delete(path);
      this.backgroundInFlight += 1;
      void this.loadMedia(path, "low").finally(() => {
        this.backgroundInFlight -= 1;
        this.scheduleBackgroundPump();
      });
    }
  }
}
''', encoding="utf-8")

(ROOT / "frontend/src/components/map/mediaPreloadScheduler.test.ts").write_text(r'''import { describe, expect, it } from "vitest";

import { MediaPreloadScheduler, type MediaPreloadPriority } from "./mediaPreloadScheduler";

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function deferred(): Deferred {
  let resolve = () => undefined;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("MediaPreloadScheduler", () => {
  it("pauses queued background work while an interactive load is active", async () => {
    const pending = new Map<string, Deferred>();
    const starts: Array<[string, MediaPreloadPriority]> = [];
    const loader = (path: string, priority: MediaPreloadPriority) => {
      starts.push([path, priority]);
      const task = deferred();
      pending.set(path, task);
      return task.promise;
    };
    const scheduler = new MediaPreloadScheduler(loader, (callback) => callback(), 2);

    scheduler.enqueueBackground(["bg-1", "bg-2", "bg-3"]);
    expect(starts).toEqual([
      ["bg-1", "low"],
      ["bg-2", "low"],
    ]);

    const interactive = scheduler.prioritize(["selected"]);
    expect(starts.at(-1)).toEqual(["selected", "high"]);

    pending.get("bg-1")?.resolve();
    pending.get("bg-2")?.resolve();
    await flushMicrotasks();
    expect(starts.some(([path]) => path === "bg-3")).toBe(false);

    pending.get("selected")?.resolve();
    await interactive;
    await flushMicrotasks();
    expect(starts.at(-1)).toEqual(["bg-3", "low"]);
  });

  it("removes a queued background image when user intent promotes it", async () => {
    const pending = new Map<string, Deferred>();
    const starts: Array<[string, MediaPreloadPriority]> = [];
    const loader = (path: string, priority: MediaPreloadPriority) => {
      starts.push([path, priority]);
      const task = deferred();
      pending.set(`${path}:${priority}`, task);
      return task.promise;
    };
    const scheduler = new MediaPreloadScheduler(loader, (callback) => callback(), 1);

    scheduler.enqueueBackground(["bg-active", "clicked"]);
    const interactive = scheduler.prioritize(["clicked"]);
    expect(starts).toEqual([
      ["bg-active", "low"],
      ["clicked", "high"],
    ]);

    pending.get("clicked:high")?.resolve();
    await interactive;
    pending.get("bg-active:low")?.resolve();
    await flushMicrotasks();

    expect(starts.filter(([path]) => path === "clicked")).toHaveLength(1);
  });
});
''', encoding="utf-8")

(ROOT / "frontend/src/components/map/placeGalleryPreload.ts").write_text(r'''import type { QueryClient } from "@tanstack/react-query";
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
          const backgroundThumbPaths = galleryThumbPaths(place, photos).filter((path) => !primaryThumbPathSet.has(path));
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
''', encoding="utf-8")

place_layer = ROOT / "frontend/src/components/map/PlaceLayer.tsx"
text = place_layer.read_text(encoding="utf-8")
text = text.replace(
    'import { usePlaceGalleryPrefetch, useVisiblePlaceGalleriesPreload } from "./placeGalleryPreload";',
    'import { usePlaceGalleryPreloadControls, useVisiblePlaceGalleriesPreload } from "./placeGalleryPreload";',
)
text = text.replace(
    '  const prefetchPlaceGallery = usePlaceGalleryPrefetch();',
    '  const { prefetchPlaceGallery, prioritizeMediaItem, prioritizePlaceGallery } = usePlaceGalleryPreloadControls();',
)
text = text.replace(
    '            onMediaOpen={(nextPlace, nextItem) => {\n              setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: nextPlace.id });\n            }}\n            onToggleGallery={() => togglePlaceGallery(place)}',
    '            onMediaOpen={(nextPlace, nextItem) => {\n              prioritizeMediaItem(nextItem);\n              setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: nextPlace.id });\n            }}\n            onToggleGallery={() => {\n              if (expandedPlaceId !== place.id) {\n                prioritizePlaceGallery(place);\n              }\n              togglePlaceGallery(place);\n            }}',
)
text = text.replace(
    '          onNavigate={(nextItem) => {\n            setActiveAudioTarget(null);\n            setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: detailPlace.id });\n          }}',
    '          onNavigate={(nextItem) => {\n            prioritizeMediaItem(nextItem);\n            setActiveAudioTarget(null);\n            setVisualDetail({ id: nextItem.id, kind: nextItem.kind, placeId: detailPlace.id });\n          }}',
)
place_layer.write_text(text, encoding="utf-8")

media_image = ROOT / "frontend/src/components/ui/MediaImage.tsx"
text = media_image.read_text(encoding="utf-8")
text = text.replace('  fit?: MediaFit;\n  imageClassName?: string;', '  fetchPriority?: "high" | "low" | "auto";\n  fit?: MediaFit;\n  imageClassName?: string;')
text = text.replace('  className,\n  fit = "cover",', '  className,\n  fetchPriority = "auto",\n  fit = "cover",')
text = text.replace('        decoding="async"\n        loading={loading}', '        decoding="async"\n        fetchPriority={fetchPriority}\n        loading={loading}')
media_image.write_text(text, encoding="utf-8")

photo_detail = ROOT / "frontend/src/components/map/photo-detail/PhotoDetailModal.tsx"
text = photo_detail.read_text(encoding="utf-8")
text = text.replace('          className="photo-detail-image-wrap"\n          imageClassName="photo-detail-image"', '          className="photo-detail-image-wrap"\n          fetchPriority="high"\n          imageClassName="photo-detail-image"')
photo_detail.write_text(text, encoding="utf-8")

security = ROOT / "backend/app/core/security_headers.py"
text = security.read_text(encoding="utf-8")
text = text.replace(
    'PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400"\nPUBLIC_IMAGE_REVALIDATE_CACHE_CONTROL',
    'PUBLIC_MEDIA_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400"\nPUBLIC_MEDIA_CDN_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=86400"\nPUBLIC_IMAGE_REVALIDATE_CACHE_CONTROL',
)
text = text.replace(
    '        response.headers["CDN-Cache-Control"] = "no-store"\n        response.headers["Cloudflare-CDN-Cache-Control"] = "no-store"\n    elif is_public_photo_image_path',
    '        response.headers["CDN-Cache-Control"] = PUBLIC_MEDIA_CDN_CACHE_CONTROL\n        response.headers["Cloudflare-CDN-Cache-Control"] = PUBLIC_MEDIA_CDN_CACHE_CONTROL\n    elif is_public_photo_image_path',
)
security.write_text(text, encoding="utf-8")

security_test = ROOT / "backend/app/tests/api/admin/test_security_headers.py"
text = security_test.read_text(encoding="utf-8")
text = text.replace(
    '    PUBLIC_MEDIA_CACHE_CONTROL,\n    SECURITY_HEADERS,',
    '    PUBLIC_MEDIA_CACHE_CONTROL,\n    PUBLIC_MEDIA_CDN_CACHE_CONTROL,\n    SECURITY_HEADERS,',
)
text = text.replace(
    'def test_public_media_uses_reusable_browser_cache_without_cdn_storage(client_session) -> None:',
    'def test_public_media_uses_reusable_browser_and_cdn_cache(client_session) -> None:',
)
text = text.replace(
    '    assert response.headers["cache-control"] == PUBLIC_MEDIA_CACHE_CONTROL\n    assert_cdn_no_store(response)\n\n\ndef test_public_photo_original',
    '    assert response.headers["cache-control"] == PUBLIC_MEDIA_CACHE_CONTROL\n    assert response.headers["cdn-cache-control"] == PUBLIC_MEDIA_CDN_CACHE_CONTROL\n    assert response.headers["cloudflare-cdn-cache-control"] == PUBLIC_MEDIA_CDN_CACHE_CONTROL\n\n\ndef test_public_photo_original',
)
security_test.write_text(text, encoding="utf-8")
