import type { FormEvent } from "react";

import { mediaUrl, type Photo } from "../../api/client";
import type { AdminMediaPlaceGroup } from "./adminMediaGroups";
import { ADMIN_MEDIA_STATUS_LABELS, PHOTO_CAPTION_MAX_LENGTH } from "./adminMediaUi";

type Props = {
  captionDraft: string;
  group: AdminMediaPlaceGroup<Photo>;
  isEditing: boolean;
  isSavingCaption: boolean;
  onCancelCaptionEdit: () => void;
  onCaptionDraftChange: (value: string) => void;
  onDelete: (photo: Photo) => void;
  onReview: (photoId: string, status: "approved" | "rejected") => void;
  onSaveCaption: (event: FormEvent<HTMLFormElement>, photoId: string) => void;
  onSetCover: (photo: Photo) => void;
  onStartCaptionEdit: (photo: Photo) => void;
  photo: Photo;
};

export function PhotoQueueItem({
  captionDraft,
  group,
  isEditing,
  isSavingCaption,
  onCancelCaptionEdit,
  onCaptionDraftChange,
  onDelete,
  onReview,
  onSaveCaption,
  onSetCover,
  onStartCaptionEdit,
  photo,
}: Props) {
  const isCover = group.place?.cover_photo_id === photo.id;

  return (
    <article className="ui-card admin-media-item">
      <img
        className="admin-media-item-image"
        alt={photo.caption ?? group.title}
        decoding="async"
        loading="lazy"
        src={mediaUrl(photo.thumb_path)}
      />
      <div className="admin-media-item-body">
        <div className="photo-meta-row">
          <span className={`ui-status ui-status--${photo.status}`}>{ADMIN_MEDIA_STATUS_LABELS[photo.status]}</span>
          {isCover ? <span className="ui-status ui-status--cover">główne</span> : null}
        </div>
        {isEditing ? (
          <form className="ui-form admin-media-edit-form" onSubmit={(event) => onSaveCaption(event, photo.id)}>
            <label>
              Podpis
              <input
                maxLength={PHOTO_CAPTION_MAX_LENGTH}
                value={captionDraft}
                onChange={(event) => onCaptionDraftChange(event.target.value)}
              />
            </label>
            <div className="review-actions">
              <button type="submit" disabled={isSavingCaption}>
                {isSavingCaption ? "Zapisywanie..." : "Zapisz"}
              </button>
              <button className="ui-button ui-button--ghost" type="button" onClick={onCancelCaptionEdit}>
                Anuluj
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="admin-media-caption">{photo.caption ?? "Brak podpisu"}</p>
            <button
              className="ui-button ui-button--ghost admin-media-link-button"
              type="button"
              onClick={() => onStartCaptionEdit(photo)}
            >
              Edytuj podpis
            </button>
          </>
        )}
        <div className="review-actions">
          {photo.status !== "approved" ? (
            <button type="button" onClick={() => onReview(photo.id, "approved")}>
              {photo.status === "rejected" ? "Przywróć" : "Zatwierdź"}
            </button>
          ) : null}
          {photo.status !== "rejected" ? (
            <button
              className="ui-button ui-button--secondary"
              type="button"
              onClick={() => onReview(photo.id, "rejected")}
            >
              {photo.status === "approved" ? "Ukryj" : "Odrzuć"}
            </button>
          ) : null}
          {photo.status === "approved" && !isCover ? (
            <button className="ui-button ui-button--ghost" type="button" onClick={() => onSetCover(photo)}>
              Ustaw jako główne
            </button>
          ) : null}
          <button className="ui-button ui-button--danger" type="button" onClick={() => onDelete(photo)}>
            Usuń trwale
          </button>
        </div>
      </div>
    </article>
  );
}
