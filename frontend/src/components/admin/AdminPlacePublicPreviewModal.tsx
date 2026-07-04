import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getPlacePhotos } from "../../api/media";
import type { PlaceCustomFieldDefinition, PlaceMapItem } from "../../api/types";
import { PhotoDetailModal } from "../map/PhotoDetailModal";
import { ReportSheet } from "../map/ReportSheet";
import {
  findPlaceGalleryItem,
  getPlaceGalleryItems,
  getPlacePreviewVisual,
  type PlaceMapVisualItem,
} from "../map/placePreview";

type Props = {
  customFieldDefinitions: PlaceCustomFieldDefinition[];
  onClose: () => void;
  place: PlaceMapItem;
};

type ReportTarget = {
  item: PlaceMapVisualItem;
  place: PlaceMapItem;
} | null;

type GalleryTarget = Pick<PlaceMapVisualItem, "id" | "kind">;

export function AdminPlacePublicPreviewModal({ customFieldDefinitions, onClose, place }: Props) {
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const previewItem = getPlacePreviewVisual(place);
  const previewItemId = previewItem?.id ?? null;
  const previewItemKind = previewItem?.kind ?? null;
  const [currentTarget, setCurrentTarget] = useState<GalleryTarget | null>(
    previewItemId && previewItemKind ? { id: previewItemId, kind: previewItemKind } : null,
  );
  const placePhotosQuery = useQuery({
    enabled: Boolean(previewItem),
    queryFn: () => getPlacePhotos(place.id),
    queryKey: ["place", place.id, "photos"],
    staleTime: 60_000,
  });
  const galleryItems = getPlaceGalleryItems(place, placePhotosQuery.data ?? null);
  const currentItemWithDetails = currentTarget
    ? findPlaceGalleryItem(place, currentTarget, placePhotosQuery.data ?? null)
    : null;
  const previewItemWithDetails = currentItemWithDetails ?? previewItem;

  useEffect(() => {
    setCurrentTarget(previewItemId && previewItemKind ? { id: previewItemId, kind: previewItemKind } : null);
  }, [place.id, previewItemId, previewItemKind]);

  if (!previewItemWithDetails) {
    return null;
  }

  return (
    <>
      <PhotoDetailModal
        customFieldDefinitions={customFieldDefinitions}
        item={previewItemWithDetails}
        navigationItems={galleryItems.filter((item) => item.kind === "photo")}
        place={place}
        onClose={onClose}
        onNavigate={(item) => setCurrentTarget({ id: item.id, kind: item.kind })}
        onReport={() => setReportTarget({ item: previewItemWithDetails, place })}
      />
      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
    </>
  );
}
