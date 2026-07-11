import type { AdminPhoto, ReviewFinalStatus } from "../../api/types";
import { AdminAudioControls } from "./AdminAudioControls";
import { AdminMediaImage } from "./AdminAuthenticatedMedia";
import type { AdminMediaPlaceGroup } from "./adminMediaGroups";
import { ADMIN_MEDIA_STATUS_LABELS } from "./adminMediaUi";
import { AdminPhotoActionBar } from "./AdminPhotoActionBar";
import { PhotoAttributionSummary } from "./PhotoAttributionFields";

type Props = {
  group: AdminMediaPlaceGroup<AdminPhoto>;
  onClearCover: (photo: AdminPhoto) => void;
  onDelete: (photo: AdminPhoto) => void;
  onDeleteAudio: (photo: AdminPhoto) => Promise<void>;
  onError: (message: string | null) => void;
  onRedact: (photo: AdminPhoto) => void;
  onReview: (photoId: string, status: ReviewFinalStatus) => void;
  onSaveAudio: (photo: AdminPhoto, file: File) => Promise<void>;
  onSetCover: (photo: AdminPhoto) => void;
  onStartCaptionEdit: (photo: AdminPhoto) => void;
  photo: AdminPhoto;
};

export function PhotoQueueItem({
  group,
  onClearCover,
  onDelete,
  onDeleteAudio,
  onError,
  onRedact,
  onReview,
  onSaveAudio,
  onSetCover,
  onStartCaptionEdit,
  photo,
}: Props) {
  const isCover = group.place?.cover_photo_id === photo.id;

  return (
    <article className="ui-card admin-media-item">
      <AdminMediaImage
        className="admin-media-item-image"
        alt={photo.caption ?? group.title}
        decoding="async"
        loading="lazy"
        src={photo.admin_thumb_path}
      />
      <div className="admin-media-item-body">
        <div className="photo-meta-row">
          <span className={`ui-status ui-status--${photo.status}`}>{ADMIN_MEDIA_STATUS_LABELS[photo.status]}</span>
          {isCover ? <span className="ui-status ui-status--cover">główne</span> : null}
        </div>
        <p className="admin-media-caption">{photo.caption ?? "Brak podpisu"}</p>
        <PhotoAttributionSummary photo={photo} />
        <AdminAudioControls
          audio={photo.admin_audio}
          inputKeyPrefix={`photo-audio-${photo.id}`}
          mode="compact"
          onDeleteAudio={() => onDeleteAudio(photo)}
          onError={onError}
          onSaveAudio={(file) => onSaveAudio(photo, file)}
        />
        <AdminPhotoActionBar
          isCover={isCover}
          photo={photo}
          onClearCover={() => onClearCover(photo)}
          onDelete={() => onDelete(photo)}
          onEditText={() => onStartCaptionEdit(photo)}
          onRedact={() => onRedact(photo)}
          onReview={(status) => onReview(photo.id, status)}
          onSetCover={() => onSetCover(photo)}
        />
      </div>
    </article>
  );
}
