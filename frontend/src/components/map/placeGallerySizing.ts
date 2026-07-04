import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

const GALLERY_DISPLAY_CONFIG = MAP_DISPLAY_CONFIG.placeGallery.display;

type GalleryMaxSizeOptions = {
  availableHeight: number;
  availableWidth: number;
  itemCount: number;
  viewportHeight: number;
  viewportWidth: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safePositiveNumber(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function galleryViewportRatio(itemCount: number) {
  const progress = clamp((Math.max(1, itemCount) - 4) / Math.max(1, GALLERY_DISPLAY_CONFIG.denseItemCount - 4), 0, 1);

  return (
    GALLERY_DISPLAY_CONFIG.compactViewportRatio +
    (GALLERY_DISPLAY_CONFIG.denseViewportRatio - GALLERY_DISPLAY_CONFIG.compactViewportRatio) * progress
  );
}

export function getPlaceGalleryMaxSize({
  availableHeight,
  availableWidth,
  itemCount,
  viewportHeight,
  viewportWidth,
}: GalleryMaxSizeOptions) {
  const availableDiameter = Math.min(safePositiveNumber(availableWidth), safePositiveNumber(availableHeight));
  const viewportDiameter =
    Math.min(safePositiveNumber(viewportWidth), safePositiveNumber(viewportHeight)) * galleryViewportRatio(itemCount);
  const maxDiameter = Math.max(
    GALLERY_DISPLAY_CONFIG.minDiameter,
    Math.min(GALLERY_DISPLAY_CONFIG.maxDiameter, viewportDiameter, availableDiameter),
  );

  return {
    maxHeight: maxDiameter,
    maxWidth: maxDiameter,
  };
}
