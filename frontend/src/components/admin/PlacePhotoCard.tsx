import { mediaUrl } from "../../api/http";
import type { AdminPhoto, ReviewFinalStatus } from "../../api/types";
import { ADMIN_MEDIA_STATUS_LABELS } from "./adminMediaUi";
import { AdminPhotoActionBar } from "./AdminPhotoActionBar";
import { PhotoAttributionSummary } from "./PhotoAttributionFields";

type Props = {
  isCover: boolean;
  isSettingCover: boolean;
  photo: AdminPhoto;
  placeTitle: string;
  onClearCover: () => void;
  onPreview: (photo: AdminPhoto) => void;
  onRequestDelete: (photo: AdminPhoto) => void;
  onReview: (photoId: string, status: ReviewFinalStatus) => void;
  onSetCover: (photo: AdminPhoto) => void;
  onStartCaptionEdit: (photo: AdminPhoto) => void;
};

export function PlacePhotoCard({
  isCover,
  isSettingCover,
  photo,
  placeTitle,
  onClearCover,
  onPreview,
  onRequestDelete,
  onReview,
  onSetCover,
  onStartCaptionEdit,
}: Props) {
  return (
    <article className="ui-card admin-media-item">
      <button
        className="admin-media-image-button"
        type="button"
        onClick={() => onPreview(photo)}
        aria-label={`Otwórz galerię zdjęć miejsca ${placeTitle}`}
      >
        <img
          className="admin-media-item-image"
          alt={photo.caption ?? placeTitle}
          decoding="async"
          loading="lazy"
          src={mediaUrl(photo.thumb_path)}
        />
      </button>
      <div className="admin-media-item-body">
        <div className="photo-meta-row">
          <span className={`ui-status ui-status--${photo.status}`}>{ADMIN_MEDIA_STATUS_LABELS[photo.status]}</span>
          {isCover ? <span className="ui-status ui-status--cover">główne</span> : null}
          {photo.audio ? <span className="ui-status ui-status--info">audio</span> : null}
        </div>
        <p className="admin-media-caption">{photo.caption ?? "Brak podpisu"}</p>
        <PhotoAttributionSummary photo={photo} />
        <AdminPhotoActionBar
          isCover={isCover}
          isSettingCover={isSettingCover}
          photo={photo}
          onClearCover={onClearCover}
          onDelete={() => onRequestDelete(photo)}
          onEditText={() => onStartCaptionEdit(photo)}
          onPreview={() => onPreview(photo)}
          onReview={(status) => onReview(photo.id, status)}
          onSetCover={() => onSetCover(photo)}
        />
      </div>
    </article>
  );
}
