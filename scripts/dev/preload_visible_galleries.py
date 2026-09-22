from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


# Keep canonical query options isolated from preload side effects.
query_path = ROOT / "frontend/src/components/map/placeGalleryQuery.ts"
query_text = query_path.read_text(encoding="utf-8")
expected = '''import { useQueryClient } from "@tanstack/react-query";\nimport { useCallback } from "react";\n\nimport { getPlacePhotos } from "../../api/media";\n\nexport const PLACE_GALLERY_STALE_TIME_MS = 60_000;\n\nexport function placeGalleryQueryOptions(placeId: string) {\n  return {\n    queryKey: ["place", placeId, "photos"] as const,\n    queryFn: () => getPlacePhotos(placeId),\n    staleTime: PLACE_GALLERY_STALE_TIME_MS,\n  };\n}\n\nexport function usePlaceGalleryPrefetch() {\n  const queryClient = useQueryClient();\n\n  return useCallback(\n    (placeId: string) => {\n      void queryClient.prefetchQuery(placeGalleryQueryOptions(placeId));\n    },\n    [queryClient],\n  );\n}\n'''
replacement = '''import { getPlacePhotos } from "../../api/media";\n\nexport const PLACE_GALLERY_STALE_TIME_MS = 60_000;\n\nexport function placeGalleryQueryOptions(placeId: string) {\n  return {\n    queryKey: ["place", placeId, "photos"] as const,\n    queryFn: () => getPlacePhotos(placeId),\n    staleTime: PLACE_GALLERY_STALE_TIME_MS,\n  };\n}\n'''
assert query_text == expected, "placeGalleryQuery.ts drifted"
query_path.write_text(replacement, encoding="utf-8")

write(
    "frontend/src/components/map/placeGalleryPreload.ts",
    '''import type { QueryClient } from "@tanstack/react-query";\nimport { useQueryClient } from "@tanstack/react-query";\nimport { useCallback, useEffect } from "react";\n\nimport { mediaUrl } from "../../api/http";\nimport type { Photo, PlaceMapItem } from "../../api/types";\nimport { placeGalleryQueryOptions } from "./placeGalleryQuery";\nimport { getPlaceGalleryItems, type PlaceMapVisualItem } from "./placePreview";\n\nconst loadedThumbnailUrls = new Set<string>();\nconst activeThumbnailPreloads = new Map<string, HTMLImageElement>();\n\nexport function uniqueGalleryThumbPaths(items: Array<Pick<PlaceMapVisualItem, "thumb_path">>): string[] {\n  return [...new Set(items.map((item) => item.thumb_path).filter(Boolean))];\n}\n\nexport function galleryThumbPaths(place: PlaceMapItem, photos: Photo[]): string[] {\n  return uniqueGalleryThumbPaths(getPlaceGalleryItems(place, photos));\n}\n\nexport function preloadGalleryThumbPaths(paths: string[]): void {\n  if (typeof Image === "undefined") {\n    return;\n  }\n\n  for (const path of paths) {\n    const url = mediaUrl(path);\n    if (loadedThumbnailUrls.has(url) || activeThumbnailPreloads.has(url)) {\n      continue;\n    }\n\n    const image = new Image();\n    activeThumbnailPreloads.set(url, image);\n\n    image.addEventListener(\n      "load",\n      () => {\n        activeThumbnailPreloads.delete(url);\n        loadedThumbnailUrls.add(url);\n      },\n      { once: true },\n    );\n    image.addEventListener(\n      "error",\n      () => {\n        activeThumbnailPreloads.delete(url);\n      },\n      { once: true },\n    );\n    image.src = url;\n  }\n}\n\nasync function preloadPlaceGallery(queryClient: QueryClient, place: PlaceMapItem): Promise<void> {\n  const photos = await queryClient.fetchQuery(placeGalleryQueryOptions(place.id));\n  preloadGalleryThumbPaths(galleryThumbPaths(place, photos));\n}\n\nfunction preloadPlaceGallerySafely(queryClient: QueryClient, place: PlaceMapItem): void {\n  void preloadPlaceGallery(queryClient, place).catch(() => undefined);\n}\n\nexport function usePlaceGalleryPrefetch() {\n  const queryClient = useQueryClient();\n\n  return useCallback(\n    (place: PlaceMapItem) => {\n      preloadPlaceGallerySafely(queryClient, place);\n    },\n    [queryClient],\n  );\n}\n\nexport function useVisiblePlaceGalleriesPreload(places: PlaceMapItem[]): void {\n  const queryClient = useQueryClient();\n\n  useEffect(() => {\n    if (places.length === 0 || typeof window === "undefined") {\n      return;\n    }\n\n    let cancelled = false;\n    const preloadVisibleGalleries = () => {\n      if (cancelled) {\n        return;\n      }\n      for (const place of places) {\n        preloadPlaceGallerySafely(queryClient, place);\n      }\n    };\n\n    if (typeof window.requestIdleCallback === "function") {\n      const idleCallbackId = window.requestIdleCallback(preloadVisibleGalleries, { timeout: 800 });\n      return () => {\n        cancelled = true;\n        window.cancelIdleCallback(idleCallbackId);\n      };\n    }\n\n    const timeoutId = window.setTimeout(preloadVisibleGalleries, 200);\n    return () => {\n      cancelled = true;\n      window.clearTimeout(timeoutId);\n    };\n  }, [places, queryClient]);\n}\n''',
)

# Wire visible-place background preload and keep intent preload as the fast path.
layer_path = ROOT / "frontend/src/components/map/PlaceLayer.tsx"
layer_text = layer_path.read_text(encoding="utf-8")
layer_text = layer_text.replace(
    'import { usePlaceGalleryPrefetch } from "./placeGalleryQuery";\n',
    'import { usePlaceGalleryPrefetch, useVisiblePlaceGalleriesPreload } from "./placeGalleryPreload";\n',
)
needle = '''  const { markerDisplayOffsets, markerPlaces } = useMapMarkerLayout({\n    map,\n    mapSettings,\n    mapViewport,\n    places,\n  });\n'''
assert needle in layer_text, "PlaceLayer marker layout block drifted"
layer_text = layer_text.replace(needle, needle + '  useVisiblePlaceGalleriesPreload(markerPlaces);\n')
layer_text = layer_text.replace(
    '            onPrefetchGallery={() => prefetchPlaceGallery(place.id)}\n',
    '            onPrefetchGallery={() => prefetchPlaceGallery(place)}\n',
)
layer_path.write_text(layer_text, encoding="utf-8")

write(
    "frontend/src/components/map/placeGalleryPreload.test.ts",
    '''import { describe, expect, it } from "vitest";\n\nimport { uniqueGalleryThumbPaths } from "./placeGalleryPreload";\n\ndescribe("uniqueGalleryThumbPaths", () => {\n  it("deduplicates gallery thumbnails while preserving order", () => {\n    expect(\n      uniqueGalleryThumbPaths([\n        { thumb_path: "/media/a-thumb.jpg" },\n        { thumb_path: "/media/b-thumb.jpg" },\n        { thumb_path: "/media/a-thumb.jpg" },\n      ]),\n    ).toEqual(["/media/a-thumb.jpg", "/media/b-thumb.jpg"]);\n  });\n});\n''',
)

# Give media files a real freshness lifetime so background-preloaded thumbs can be reused without validation on every open.
main_path = ROOT / "backend/app/main.py"
main_text = main_path.read_text(encoding="utf-8")
main_text = main_text.replace("from fastapi.staticfiles import StaticFiles\n", "")
main_text = main_text.replace(
    "from app.db.session import create_db_and_tables\n",
    "from app.db.session import create_db_and_tables\nfrom app.media_static import PublicMediaStaticFiles\n",
)
main_text = main_text.replace(
    'app.mount("/media", StaticFiles(directory=PUBLIC_STORAGE_DIR, check_dir=False), name="media")',
    'app.mount("/media", PublicMediaStaticFiles(directory=PUBLIC_STORAGE_DIR, check_dir=False), name="media")',
)
main_path.write_text(main_text, encoding="utf-8")

write(
    "backend/app/media_static.py",
    '''from fastapi.responses import Response\nfrom fastapi.staticfiles import StaticFiles\nfrom starlette.types import Scope\n\nPUBLIC_MEDIA_CACHE_HEADERS = {\n    "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",\n}\n\n\nclass PublicMediaStaticFiles(StaticFiles):\n    async def get_response(self, path: str, scope: Scope) -> Response:\n        response = await super().get_response(path, scope)\n        if response.status_code < 400:\n            response.headers.update(PUBLIC_MEDIA_CACHE_HEADERS)\n        return response\n''',
)

write(
    "backend/app/tests/services/test_media_static.py",
    '''from fastapi import FastAPI\nfrom fastapi.testclient import TestClient\n\nfrom app.media_static import PUBLIC_MEDIA_CACHE_HEADERS, PublicMediaStaticFiles\n\n\ndef test_public_media_static_files_use_reusable_browser_cache(tmp_path) -> None:\n    (tmp_path / "thumb.jpg").write_bytes(b"thumb")\n    app = FastAPI()\n    app.mount("/media", PublicMediaStaticFiles(directory=tmp_path), name="media")\n\n    response = TestClient(app).get("/media/thumb.jpg")\n\n    assert response.status_code == 200\n    assert response.headers["Cache-Control"] == PUBLIC_MEDIA_CACHE_HEADERS["Cache-Control"]\n''',
)
