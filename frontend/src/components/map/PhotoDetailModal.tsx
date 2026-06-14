import { useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import type { MouseEvent } from "react";

import { getPlaceMemory, mediaUrl, type PlaceMapItem } from "../../api/client";
import { ErrorModal } from "../ui/ErrorModal";
import { MediaImage } from "../ui/MediaImage";
import { SystemModal } from "../ui/SystemModal";
import { mapMediaDisplay } from "./mediaDisplayText";
import { MemoryOwnerTools } from "./MemoryOwnerTools";
import type { RectLike } from "./pinnedMediaBoardTypes";
import type { PlaceMapVisualItem } from "./placePreview";
import { useMemoryOwnerTools } from "./useMemoryOwnerTools";

type Props = {
  item: PlaceMapVisualItem;
  onClose: () => void;
  onPin?: (request: { aspectRatio: number | null; sourceRect: RectLike | null }) => boolean;
  onReport: () => void;
  place: PlaceMapItem;
};

export function PhotoDetailModal({ item, onClose, onPin, onReport, place }: Props) {
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
  const display = mapMediaDisplay(item.kind, item.caption, place.description, place.local_comment, memorySource);
  const hasDisplayText = Boolean(display.title || display.body || display.meta);
  const modalEyebrow = place.categories[0]?.label ?? "Miejsce";
  const pinLabel = item.kind === "memory" ? "Przypnij pamiątkę" : "Przypnij zdjęcie";

  const handlePin = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const modalElement = event.currentTarget.closest(".system-modal");
    const imageElement = modalElement?.querySelector<HTMLImageElement>(".photo-detail-image") ?? null;
    const modalRect = modalElement?.getBoundingClientRect() ?? null;
    const sourceRect = modalRect
      ? {
          height: modalRect.height,
          left: modalRect.left,
          top: modalRect.top,
          width: modalRect.width,
        }
      : null;
    const aspectRatio =
      imageElement && imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0
        ? imageElement.naturalWidth / imageElement.naturalHeight
        : sourceRect && sourceRect.width > 0 && sourceRect.height > 0
          ? sourceRect.width / sourceRect.height
          : null;

    onPin?.({ aspectRatio, sourceRect });
  };

  return (
    <SystemModal
      eyebrow={modalEyebrow}
      headerActions={
        onPin ? (
          <button
            className="system-modal-icon-action"
            type="button"
            aria-label={pinLabel}
            title={pinLabel}
            onClick={handlePin}
          >
            <Pin aria-hidden="true" size={18} />
          </button>
        ) : null
      }
      showActions={false}
      size="large"
      title={place.title}
      variant="media"
      onClose={onClose}
    >
      <div className={hasDisplayText ? "photo-detail-content has-copy" : "photo-detail-content"}>
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
            {hasDisplayText ? (
              <div className="photo-detail-text">
                {display.title ? <span className="photo-detail-text-title">{display.title}</span> : null}
                {display.body ? <span className="photo-detail-text-body">{display.body}</span> : null}
                {display.meta ? <span className="photo-detail-text-meta">{display.meta}</span> : null}
              </div>
            ) : null}
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
