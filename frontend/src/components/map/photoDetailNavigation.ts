import type { PlaceMapVisualItem } from "./placePreview";

export type PhotoDetailNavigationDirection = -1 | 1;

export function photoDetailNavigationItems(items: PlaceMapVisualItem[]): PlaceMapVisualItem[] {
  return items.filter((item) => item.kind === "photo");
}

export function photoDetailNavigationIndex(items: PlaceMapVisualItem[], item: PlaceMapVisualItem): number {
  return items.findIndex((navigationItem) => navigationItem.kind === item.kind && navigationItem.id === item.id);
}

export function nextPhotoDetailNavigationItem(
  items: PlaceMapVisualItem[],
  currentIndex: number,
  direction: PhotoDetailNavigationDirection,
): PlaceMapVisualItem | null {
  if (items.length <= 1 || currentIndex < 0) {
    return null;
  }

  const nextIndex = (currentIndex + direction + items.length) % items.length;
  return items[nextIndex] ?? null;
}
