import { useCallback, useEffect, useMemo } from "react";

import { mediaUrl } from "../../api/http";
import {
  nextPhotoDetailNavigationItem,
  photoDetailNavigationIndex,
  photoDetailNavigationItems,
  type PhotoDetailNavigationDirection,
} from "./photoDetailNavigation";
import type { PlaceMapVisualItem } from "./placePreview";

type Params = {
  item: PlaceMapVisualItem;
  navigationItems: PlaceMapVisualItem[];
  onNavigate?: (item: PlaceMapVisualItem) => void;
};

const preloadedPhotoUrls = new Set<string>();

function preloadPhotoUrl(url: string) {
  if (preloadedPhotoUrls.has(url)) {
    return;
  }

  preloadedPhotoUrls.add(url);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  void image.decode?.().catch(() => undefined);
}

export function usePhotoDetailNavigation({ item, navigationItems, onNavigate }: Params) {
  const photos = useMemo(() => photoDetailNavigationItems(navigationItems), [navigationItems]);
  const currentIndex = photoDetailNavigationIndex(photos, item);
  const canNavigate = item.kind === "photo" && Boolean(onNavigate) && photos.length > 1 && currentIndex >= 0;

  const navigate = useCallback(
    (direction: PhotoDetailNavigationDirection) => {
      const nextItem = nextPhotoDetailNavigationItem(photos, currentIndex, direction);
      if (canNavigate && nextItem) {
        onNavigate?.(nextItem);
      }
    },
    [canNavigate, currentIndex, onNavigate, photos],
  );

  useEffect(() => {
    if (!canNavigate) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      navigate(event.key === "ArrowLeft" ? -1 : 1);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [canNavigate, navigate]);

  useEffect(() => {
    if (!canNavigate) {
      return;
    }

    const preloadIndex = (index: number) => {
      const normalizedIndex = (index + photos.length) % photos.length;
      const photo = photos[normalizedIndex];
      if (photo) {
        preloadPhotoUrl(mediaUrl(photo.public_path));
      }
    };
    [currentIndex + 1, currentIndex - 1].forEach(preloadIndex);
  }, [canNavigate, currentIndex, photos]);

  return { canNavigate, navigate };
}
