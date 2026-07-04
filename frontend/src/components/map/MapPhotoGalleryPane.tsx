import { useCallback, useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import { PHOTO_GALLERY_PANE, PHOTO_GALLERY_PANE_Z_INDEX, syncPhotoGalleryPaneTransform } from "./mapPanes";

export function MapPhotoGalleryPane() {
  const map = useMap();
  const syncPane = useCallback(() => {
    const photoGalleryPane = map.getPane(PHOTO_GALLERY_PANE);
    const mapPane = map.getPane("mapPane");

    if (!photoGalleryPane || !mapPane) {
      return;
    }

    syncPhotoGalleryPaneTransform(photoGalleryPane, mapPane);
  }, [map]);

  useMapEvents({
    move: syncPane,
    moveend: syncPane,
    resize: syncPane,
    zoom: syncPane,
    zoomend: syncPane,
  });

  useEffect(() => {
    const existingPane = map.getPane(PHOTO_GALLERY_PANE);
    const pane = existingPane ?? map.createPane(PHOTO_GALLERY_PANE, map.getContainer());

    pane.classList.add("photo-gallery-pane");
    pane.style.zIndex = String(PHOTO_GALLERY_PANE_Z_INDEX);
    syncPane();
  }, [map, syncPane]);

  return null;
}
