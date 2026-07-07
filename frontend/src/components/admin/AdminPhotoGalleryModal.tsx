import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { mediaUrl } from "../../api/http";
import type { AdminPhoto, Place, ReviewFinalStatus } from "../../api/types";
import {
  PhotoDescriptionActions,
  PhotoDescriptionLayer,
  photoDescriptionText as textFromPhotoDescription,
} from "../photos/PhotoDescriptionLayer";
import { useMediaFullscreen } from "../ui/useMediaFullscreen";
import { AdminAudioControls } from "./AdminAudioControls";
import { ADMIN_MEDIA_STATUS_LABELS } from "./adminMediaUi";
import { AdminPhotoActionBar } from "./AdminPhotoActionBar";
import { PhotoAttributionSummary } from "./PhotoAttributionFields";
import { SystemModal } from "./SystemModal";

type Props = {
  currentPhotoId: string;
  isSettingCover: boolean;
  photos: AdminPhoto[];
  place: Place;
  onClearCover: () => void;
  onClose: () => void;
  onCurrentPhotoChange: (photoId: string) => void;
  onDeleteAudio: (photo: AdminPhoto) => Promise<void>;
  onEditText: (photo: AdminPhoto) => void;
  onError: (message: string | null) => void;
  onRedact: (photo: AdminPhoto) => void;
  onRequestDelete: (photo: AdminPhoto) => void;
  onReview: (photoId: string, status: ReviewFinalStatus) => void;
  onSaveAudio: (photo: AdminPhoto, nextAudioFile: File) => Promise<void>;
  onSetCover: (photo: AdminPhoto) => void;
};

export function AdminPhotoGalleryModal({
  currentPhotoId,
  isSettingCover,
  photos,
  place,
  onClearCover,
  onClose,
  onCurrentPhotoChange,
  onDeleteAudio,
  onEditText,
  onError,
  onRedact,
  onRequestDelete,
  onReview,
  onSaveAudio,
  onSetCover,
}: Props) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useMediaFullscreen(contentRef);
  const currentIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === currentPhotoId),
  );
  const photo = photos[currentIndex] ?? null;
  const hasNavigation = photos.length > 1;
  const fullscreenLabel = isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran";

  function movePhoto(offset: number) {
    if (!hasNavigation) {
      return;
    }
    const nextIndex = (currentIndex + offset + photos.length) % photos.length;
    onCurrentPhotoChange(photos[nextIndex].id);
  }

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [photo?.id]);

  if (!photo) {
    return (
      <SystemModal showActions={false} size="wide" title="Galeria zdjęć" onClose={onClose}>
        <p className="ui-empty">Brak zdjęć dla tego miejsca.</p>
      </SystemModal>
    );
  }

  const isCover = place.cover_photo_id === photo.id;
  const descriptionText = textFromPhotoDescription(photo.description_blocks);
  const hasPhotoDescription = Boolean(descriptionText);
  const galleryClassName = ["admin-photo-gallery", isDescriptionExpanded && "is-description-expanded"]
    .filter(Boolean)
    .join(" ");

  return (
    <SystemModal
      eyebrow={place.title}
      headerActions={
        <>
          <PhotoDescriptionActions
            actionClassName="system-modal-icon-action"
            descriptionText={descriptionText}
            isExpanded={isDescriptionExpanded}
            ttsKey={`admin-photo:${photo.id}:description`}
            onToggle={() => setIsDescriptionExpanded((current) => !current)}
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
        </>
      }
      isFullscreen={isFullscreen}
      showActions={false}
      size="large"
      title="Galeria zdjęć"
      variant="media"
      onClose={onClose}
    >
      <div className={galleryClassName} ref={contentRef}>
        <div className="admin-photo-gallery-stage">
          {hasNavigation ? (
            <button
              className="ui-button ui-button--ghost admin-photo-gallery-nav admin-photo-gallery-nav--prev"
              type="button"
              onClick={() => movePhoto(-1)}
              aria-label="Poprzednie zdjęcie"
            >
              <ChevronLeft aria-hidden="true" size={22} />
            </button>
          ) : null}
          <img
            className="admin-photo-gallery-image"
            alt={photo.caption ?? place.title}
            decoding="async"
            src={mediaUrl(photo.public_path)}
          />
          {hasNavigation ? (
            <button
              className="ui-button ui-button--ghost admin-photo-gallery-nav admin-photo-gallery-nav--next"
              type="button"
              onClick={() => movePhoto(1)}
              aria-label="Następne zdjęcie"
            >
              <ChevronRight aria-hidden="true" size={22} />
            </button>
          ) : null}
          <span className="admin-photo-gallery-counter">
            {currentIndex + 1}/{photos.length}
          </span>
        </div>
        {hasPhotoDescription && isDescriptionExpanded ? (
          <PhotoDescriptionLayer
            blocks={photo.description_blocks}
            className="admin-photo-gallery-description"
            contentClassName="photo-description-rich-text admin-photo-gallery-description-blocks"
          />
        ) : null}
        <div className="admin-photo-gallery-overlay">
          <div className="admin-photo-gallery-copy">
            <div className="photo-meta-row">
              <span className={`ui-status ui-status--${photo.status}`}>{ADMIN_MEDIA_STATUS_LABELS[photo.status]}</span>
              {isCover ? <span className="ui-status ui-status--cover">główne</span> : null}
              {photo.audio ? <span className="ui-status ui-status--info">audio</span> : null}
            </div>
            <p className="admin-media-caption">{photo.caption ?? "Brak podpisu"}</p>
            <PhotoAttributionSummary photo={photo} />
          </div>
          <aside className="admin-photo-gallery-sidebar" aria-label="Narzędzia zdjęcia">
            <AdminPhotoActionBar
              isCover={isCover}
              isSettingCover={isSettingCover}
              photo={photo}
              onClearCover={onClearCover}
              onDelete={() => onRequestDelete(photo)}
              onEditText={() => onEditText(photo)}
              onRedact={() => onRedact(photo)}
              onReview={(status) => onReview(photo.id, status)}
              onSetCover={() => onSetCover(photo)}
            />
            <AdminAudioControls
              audio={photo.audio}
              inputKeyPrefix={`admin-gallery-audio-${photo.id}`}
              mode="compact"
              onDeleteAudio={() => onDeleteAudio(photo)}
              onError={onError}
              onSaveAudio={(nextAudioFile) => onSaveAudio(photo, nextAudioFile)}
            />
          </aside>
        </div>
      </div>
    </SystemModal>
  );
}
