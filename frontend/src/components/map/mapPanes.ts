import { MAP_DISPLAY_CONFIG } from "./mapDisplayConfig";

export const MAP_MARKER_PANE = MAP_DISPLAY_CONFIG.panes.marker;
export const PHOTO_GALLERY_PANE = MAP_DISPLAY_CONFIG.panes.gallery;
export const PHOTO_GALLERY_PANE_Z_INDEX = MAP_DISPLAY_CONFIG.panes.galleryZIndex;

export function syncPhotoGalleryPaneTransform(photoGalleryPane: HTMLElement, mapPane: HTMLElement) {
  photoGalleryPane.style.transform = mapPane.style.transform;
}
