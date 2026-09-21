import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { mediaUrl } from "../../../api/http";
import { getPlacePhoto } from "../../../api/media";
import type { PlaceCustomFieldDefinition, PlaceMapItem } from "../../../api/types";
import {
  PhotoDescriptionActions,
  PhotoDescriptionLayer,
  photoDescriptionText as textFromPhotoDescription,
} from "../../photos/PhotoDescriptionLayer";
import { publicPlaceCustomFieldDisplayItems } from "../../placeCustomFields";
import { ErrorModal } from "../../ui/ErrorModal";
import { MediaImage } from "../../ui/MediaImage";
import { SystemModal } from "../../ui/SystemModal";
import { useMediaFullscreen } from "../../ui/useMediaFullscreen";
import { mapMediaDisplay } from "../mediaDisplayText";
import { MemoryOwnerTools } from "../MemoryOwnerTools";
import { PhotoDetailAudioControl } from "./PhotoDetailAudioControl";
import { hasPhotoDetailInfo, PhotoDetailInfoPanel } from "./PhotoDetailInfoPanel";
import { photoDetailPinRequestFromTrigger, type PhotoDetailPinRequest } from "./photoDetailPin";
import type { PlaceMapVisualItem } from "../placePreview";
import { usePhotoDetailMemory } from "./usePhotoDetailMemory";
import { usePhotoDetailNavigation } from "./usePhotoDetailNavigation";
import { usePhotoDetailSwipeNavigation } from "./usePhotoDetailSwipeNavigation";

type Props = {
  customFieldDefinitions: PlaceCustomFieldDefinition[];
  isAudioAutoplayEnabled: boolean;
  item: PlaceMapVisualItem;
  navigationItems?: PlaceMapVisualItem[];
  onClose: () => void;
  onNavigate?: (item: PlaceMapVisualItem) => void;
  onPin?: (request: PhotoDetailPinRequest) => boolean;
  onReport: () => void;
  place: PlaceMapItem;
};

export function PhotoDetailModal({
  customFieldDefinitions,
  isAudioAutoplayEnabled,
  item,
  navigationItems = [],
  onClose,
  onNavigate,
  onPin,
  onReport,
  place,
}: Props) {
  const [isCopyExpanded, setIsCopyExpanded] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useMediaFullscreen(contentRef);
  const { memoryOwnerTools, memorySource } = usePhotoDetailMemory({ item, onDeleted: onClose, place });
  const photoNavigation = usePhotoDetailNavigation({ item, navigationItems, onNavigate });
  const photoDetailSwipe = usePhotoDetailSwipeNavigation(photoNavigation);
  const photoDetailQuery = useQuery({
    queryKey: ["place", place.id, "photos", item.id, "detail"],
    queryFn: () => getPlacePhoto(place.id, item.id),
    enabled: item.kind === "photo",
    staleTime: 60_000,
  });
  const display = mapMediaDisplay(item.kind, item.caption, place.description, memorySource);
  const audio = item.kind === "memory" ? (memorySource?.audio ?? item.audio) : item.audio;
  const customFields = publicPlaceCustomFieldDisplayItems(customFieldDefinitions, place.custom_fields);
  const photoDescriptionBlocks = item.kind === "photo" ? (photoDetailQuery.data?.description_blocks ?? []) : [];
  const photoDescriptionText = textFromPhotoDescription(photoDescriptionBlocks);
  const hasCopy = hasPhotoDetailInfo({ customFields, display, item });
  const hasPhotoDescription = Boolean(photoDescriptionText);
  const modalEyebrow = place.categories[0]?.label ?? "Miejsce";
  const pinLabel = item.kind === "memory" ? "Przypnij pamiątkę" : "Przypnij zdjęcie";
  const contentClassName = [
    "photo-detail-content",
    (hasCopy || hasPhotoDescription) && "has-copy",
    isCopyExpanded && "is-copy-expanded",
    isDescriptionExpanded && "is-description-expanded",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    setIsCopyExpanded(false);
    setIsDescriptionExpanded(false);
  }, [item.id, item.kind, place.id]);

  const handlePin = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onPin?.(photoDetailPinRequestFromTrigger(event.currentTarget));
  };

  const handleContentDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest(".photo-detail-overlay")) {
      return;
    }
    toggleFullscreen();
  };

  const handleContentClick = (event: MouseEvent<HTMLDivElement>) => {
    if (
      !isCopyExpanded ||
      !(event.target instanceof HTMLElement) ||
      event.target.closest(".photo-detail-overlay, .photo-detail-description, button, a")
    ) {
      return;
    }

    setIsCopyExpanded(false);
  };

  const handleCopyToggle = () => {
    setIsDescriptionExpanded(false);
    setIsCopyExpanded((current) => !current);
  };

  const handleDescriptionToggle = () => {
    setIsCopyExpanded(false);
    setIsDescriptionExpanded((current) => !current);
  };

  const handleNavigationClick = (event: MouseEvent<HTMLButtonElement>, direction: -1 | 1) => {
    event.stopPropagation();
    photoNavigation.navigate(direction);
  };

  return (
    <SystemModal
      eyebrow={modalEyebrow}
      headerActions={
        <>
          <PhotoDetailAudioControl audio={audio} isAutoplayEnabled={isAudioAutoplayEnabled} />
          <PhotoDescriptionActions
            actionClassName="system-modal-icon-action"
            descriptionText={photoDescriptionText}
            isExpanded={isDescriptionExpanded}
            ttsKey={`photo:${item.id}:description`}
            onToggle={handleDescriptionToggle}
          />
          {onPin ? (
            <button
              className="system-modal-icon-action"
              type="button"
              aria-label={pinLabel}
              title={pinLabel}
              onClick={handlePin}
            >
              <Pin aria-hidden="true" size={18} />
            </button>
          ) : null}
        </>
      }
      dragMode="surface"
      isFullscreen={isFullscreen}
      showActions={false}
      size="large"
      title={place.title}
      variant="media"
      onClose={onClose}
    >
      <div
        ref={contentRef}
        className={contentClassName}
        data-modal-drag-surface
        onClick={handleContentClick}
        onDoubleClick={handleContentDoubleClick}
        {...photoDetailSwipe}
      >
        <MediaImage
          alt={item.caption ?? place.title}
          className="photo-detail-image-wrap"
          imageClassName="photo-detail-image"
          loading="eager"
          ratio="natural"
          src={mediaUrl(item.public_path)}
        />
        {photoNavigation.canNavigate ? (
          <>
            <button
              className="photo-detail-nav-button photo-detail-nav-button--previous"
              type="button"
              aria-label="Poprzednie zdjęcie"
              title="Poprzednie zdjęcie"
              onClick={(event) => handleNavigationClick(event, -1)}
            >
              <ChevronLeft aria-hidden="true" size={24} strokeWidth={2.25} />
            </button>
            <button
              className="photo-detail-nav-button photo-detail-nav-button--next"
              type="button"
              aria-label="Następne zdjęcie"
              title="Następne zdjęcie"
              onClick={(event) => handleNavigationClick(event, 1)}
            >
              <ChevronRight aria-hidden="true" size={24} strokeWidth={2.25} />
            </button>
          </>
        ) : null}

        {hasPhotoDescription && isDescriptionExpanded ? (
          <PhotoDescriptionLayer
            blocks={photoDescriptionBlocks}
            className="photo-detail-description"
            contentClassName="photo-description-rich-text photo-detail-description-blocks"
          />
        ) : null}
        <div className="photo-detail-overlay" data-drag-ignore>
          <PhotoDetailInfoPanel
            customFields={customFields}
            display={display}
            isExpanded={isCopyExpanded}
            item={item}
            onCollapse={() => setIsCopyExpanded(false)}
            onToggle={handleCopyToggle}
          />
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
