import { useQuery } from "@tanstack/react-query";

import { getPlaceMemory, mediaUrl, type PlaceMapItem } from "../../api/client";
import { ErrorModal } from "../ui/ErrorModal";
import { MediaImage } from "../ui/MediaImage";
import { SystemModal } from "../ui/SystemModal";
import { mapMediaCaption, mapMemoryText } from "./mediaDisplayText";
import { MemoryOwnerTools } from "./MemoryOwnerTools";
import type { PlaceMapVisualItem } from "./placePreview";
import { useMemoryOwnerTools } from "./useMemoryOwnerTools";

type Props = {
  item: PlaceMapVisualItem;
  onClose: () => void;
  onReport: () => void;
  place: PlaceMapItem;
};

export function PhotoDetailModal({ item, onClose, onReport, place }: Props) {
  const { data: memorySource = null } = useQuery({
    enabled: item.kind === "memory",
    queryFn: () => getPlaceMemory(place.id, item.id),
    queryKey: ["place-memory", place.id, item.id],
  });
  const memoryOwnerTools = useMemoryOwnerTools({
    itemKey: `${item.kind}:${item.id}`,
    memory: memorySource,
    onDeleted: onClose,
    placeId: place.id,
  });
  const displayCaption = mapMediaCaption(item.caption);
  const displayMemoryText = memorySource ? mapMemoryText(memorySource.memory_text) : "";
  const modalEyebrow = place.categories[0]?.label ?? "Miejsce";

  return (
    <SystemModal
      eyebrow={modalEyebrow}
      showActions={false}
      size="large"
      title={place.title}
      variant="media"
      onClose={onClose}
    >
      <div className="photo-detail-content">
        <MediaImage
          alt={item.caption ?? place.title}
          className="photo-detail-image-wrap"
          imageClassName="photo-detail-image"
          loading="eager"
          ratio="natural"
          src={mediaUrl(item.public_path)}
        />

        <div className="photo-detail-overlay">
          <div className="photo-detail-copy">
            {displayCaption ? <p className="photo-detail-caption-text">{displayCaption}</p> : null}
            {displayMemoryText ? <p className="photo-detail-memory-text">{displayMemoryText}</p> : null}
          </div>
          <div className="photo-detail-actions">
            {memorySource ? <MemoryOwnerTools tools={memoryOwnerTools} /> : null}
            <button className="photo-detail-report-link" type="button" aria-label="Zgłoś problem" onClick={onReport}>
              Zgłoś
            </button>
          </div>
        </div>
      </div>
      {memoryOwnerTools.operationError ? (
        <ErrorModal {...memoryOwnerTools.operationError} onClose={() => memoryOwnerTools.setOperationError(null)} />
      ) : null}
    </SystemModal>
  );
}
