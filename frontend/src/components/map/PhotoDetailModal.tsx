import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Info, Maximize2, Minimize2, Pin } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";

import { mediaUrl } from "../../api/http";
import { getPlacePhoto } from "../../api/media";
import type { PlaceCustomFieldDefinition, PlaceMapItem } from "../../api/types";
import {
  PhotoDescriptionActions,
  PhotoDescriptionLayer,
  photoDescriptionText as textFromPhotoDescription,
} from "../photos/PhotoDescriptionLayer";
import { publicPlaceCustomFieldDisplayItems } from "../placeCustomFields";
import { ErrorModal } from "../ui/ErrorModal";
import { MediaImage } from "../ui/MediaImage";
import { SystemModal } from "../ui/SystemModal";
import { useMediaFullscreen } from "../ui/useMediaFullscreen";
import { mapMediaDisplay } from "./mediaDisplayText";
import { MemoryOwnerTools } from "./MemoryOwnerTools";
import { PhotoDetailAudioControl } from "./PhotoDetailAudioControl";
import { photoDetailPinRequestFromTrigger, type PhotoDetailPinRequest } from "./photoDetailPin";
import { photoDetailSwipeDirection, type PhotoDetailSwipeStart } from "./photoDetailSwipe";
import type { PlaceMapVisualItem } from "./placePreview";
import { usePhotoDetailMemory } from "./usePhotoDetailMemory";
import { usePhotoDetailNavigation } from "./usePhotoDetailNavigation";

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

type PhotoAttributionDisplay = {
  licenseUrl: string | null;
  sourceUrl: string | null;
  text: string[];
};

type PhotoDetailSwipeState = PhotoDetailSwipeStart & {
  pointerId: number;
};

function photoAttributionDisplay(item: PlaceMapVisualItem): PhotoAttributionDisplay | null {
  if (item.kind !== "photo") {
    return null;
  }

  const text = [
    item.attribution_author ? `Autor: ${item.attribution_author}` : null,
    item.attribution_license ? `Licencja: ${item.attribution_license}` : null,
  ].filter((value): value is string => Boolean(value));

  if (text.length === 0 && !item.attribution_source_url && !item.attribution_license_url) {
    return null;
  }

  return {
    licenseUrl: item.attribution_license_url,
    sourceUrl: item.attribution_source_url,
    text,
  };
}

function isPhotoDetailSwipeTargetBlocked(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return true;
  }

  return Boolean(
    target.closest(
      [
        "a",
        "audio",
        "button",
        "input",
        "select",
        "textarea",
        "[role='button']",
        ".photo-detail-description",
        ".photo-detail-overlay",
      ].join(","),
    ),
  );
}

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
  const swipeStateRef = useRef<PhotoDetailSwipeState | null>(null);
  const { isFullscreen, toggleFullscreen } = useMediaFullscreen(contentRef);
  const { memoryOwnerTools, memorySource } = usePhotoDetailMemory({ item, onDeleted: onClose, place });
  const photoNavigation = usePhotoDetailNavigation({ item, navigationItems, onNavigate });
  const photoDetailQuery = useQuery({
    queryKey: ["place", place.id, "photos", item.id, "detail"],
    queryFn: () => getPlacePhoto(place.id, item.id),
    enabled: item.kind === "photo",
    staleTime: 60_000,
  });
  const display = mapMediaDisplay(item.kind, item.caption, place.description, memorySource);
  const audio = item.kind === "memory" ? (memorySource?.audio ?? item.audio) : item.audio;
  const customFields = publicPlaceCustomFieldDisplayItems(customFieldDefinitions, place.custom_fields);
  const photoAttribution = photoAttributionDisplay(item);
  const photoDescriptionBlocks = item.kind === "photo" ? (photoDetailQuery.data?.description_blocks ?? []) : [];
  const photoDescriptionText = textFromPhotoDescription(photoDescriptionBlocks);
  const hasDisplayText = Boolean(display.title || display.body || display.meta);
  const hasCopy = hasDisplayText || customFields.length > 0 || Boolean(photoAttribution);
  const hasPhotoDescription = Boolean(photoDescriptionText);
  const modalEyebrow = place.categories[0]?.label ?? "Miejsce";
  const pinLabel = item.kind === "memory" ? "Przypnij pamiątkę" : "Przypnij zdjęcie";
  const fullscreenLabel = isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran";
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

  const handleCopyClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest("a")) {
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

  const setSwipeCapture = (element: HTMLDivElement, pointerId: number) => {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      return;
    }
  };

  const clearSwipeCapture = (element: HTMLDivElement, pointerId: number) => {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  };

  const handleSwipePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    swipeStateRef.current = null;

    if (
      !photoNavigation.canNavigate ||
      (event.pointerType !== "touch" && event.pointerType !== "pen") ||
      isPhotoDetailSwipeTargetBlocked(event.target)
    ) {
      return;
    }

    swipeStateRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      viewportWidth: event.currentTarget.clientWidth,
    };
    setSwipeCapture(event.currentTarget, event.pointerId);
  };

  const handleSwipePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const swipeState = swipeStateRef.current;
    if (!swipeState || swipeState.pointerId !== event.pointerId) {
      return;
    }

    swipeStateRef.current = null;
    clearSwipeCapture(event.currentTarget, event.pointerId);

    const direction = photoDetailSwipeDirection(swipeState, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
    if (!direction) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    photoNavigation.navigate(direction);
  };

  const handleSwipePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const swipeState = swipeStateRef.current;
    if (!swipeState || swipeState.pointerId !== event.pointerId) {
      return;
    }

    swipeStateRef.current = null;
    clearSwipeCapture(event.currentTarget, event.pointerId);
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
          <button
            className="system-modal-icon-action"
            type="button"
            aria-label={fullscreenLabel}
            aria-pressed={isFullscreen}
            title={fullscreenLabel}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 aria-hidden="true" size={18} /> : <Maximize2 aria-hidden="true" size={18} />}
          </button>
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
        onClick={handleContentClick}
        onDoubleClick={handleContentDoubleClick}
        onPointerCancel={handleSwipePointerCancel}
        onPointerDown={handleSwipePointerDown}
        onPointerUp={handleSwipePointerEnd}
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
        <div className="photo-detail-overlay">
          {hasCopy ? (
            <button
              className="photo-detail-copy-toggle"
              type="button"
              aria-expanded={isCopyExpanded}
              aria-label={isCopyExpanded ? "Ukryj informacje" : "Pokaż informacje"}
              title={isCopyExpanded ? "Ukryj informacje" : "Pokaż informacje"}
              onClick={handleCopyToggle}
            >
              <Info aria-hidden="true" size={18} />
            </button>
          ) : null}
          {hasCopy ? (
            <div className="photo-detail-copy" onClick={handleCopyClick}>
              {hasDisplayText ? (
                <div className="photo-detail-text">
                  {display.title ? <span className="photo-detail-text-title">{display.title}</span> : null}
                  {display.body ? <span className="photo-detail-text-body">{display.body}</span> : null}
                  {display.meta ? <span className="photo-detail-text-meta">{display.meta}</span> : null}
                </div>
              ) : null}
              {customFields.length > 0 ? (
                <dl className="photo-detail-custom-fields">
                  {customFields.map((field) => (
                    <div className="photo-detail-custom-field" key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>
                        {field.href ? (
                          <a href={field.href} target="_blank" rel="noreferrer">
                            {field.text}
                          </a>
                        ) : (
                          field.text
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {photoAttribution ? (
                <div className="photo-detail-attribution">
                  {photoAttribution.text.map((text) => (
                    <span key={text}>{text}</span>
                  ))}
                  {photoAttribution.sourceUrl ? (
                    <a href={photoAttribution.sourceUrl} target="_blank" rel="noreferrer">
                      Źródło
                    </a>
                  ) : null}
                  {photoAttribution.licenseUrl ? (
                    <a href={photoAttribution.licenseUrl} target="_blank" rel="noreferrer">
                      Warunki licencji
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
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
