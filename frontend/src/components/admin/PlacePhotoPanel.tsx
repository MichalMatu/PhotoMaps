import { FormEvent, useMemo, useState } from "react";

import { deleteAdminPhoto, mediaUrl, setCoverPhoto, type Photo, type Place } from "../../api/client";
import { uploadAndApproveAdminPlacePhoto } from "./adminPhotoUpload";
import { ADMIN_MEDIA_STATUS_LABELS, PHOTO_CAPTION_MAX_LENGTH } from "./adminMediaUi";
import { canSubmitPhotoUpload } from "./photoUploadState";
import { sortPlacePhotosForPanel } from "./placePhotoPanelState";
import { SystemModal } from "./SystemModal";

type Props = {
  onChanged: () => Promise<void>;
  photos: Photo[];
  place: Place;
};

export function PlacePhotoPanel({ onChanged, photos, place }: Props) {
  const [caption, setCaption] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingCover, setIsSettingCover] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const sortedPhotos = useMemo(
    () => sortPlacePhotosForPanel(photos, place.cover_photo_id),
    [photos, place.cover_photo_id],
  );
  const canUpload = canSubmitPhotoUpload({ file, isUploading, placeId: place.id });

  function resetUpload() {
    setCaption("");
    setFile(null);
    setInputKey((currentKey) => currentKey + 1);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      await uploadAndApproveAdminPlacePhoto(place.id, file, caption);
      resetUpload();
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się dodać zdjęcia.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetCover(photo: Photo) {
    setErrorMessage(null);
    setIsSettingCover(true);
    try {
      await setCoverPhoto(photo.id);
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się ustawić zdjęcia głównego.");
    } finally {
      setIsSettingCover(false);
    }
  }

  async function handleConfirmDelete() {
    if (!photoToDelete) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await deleteAdminPhoto(photoToDelete.id);
      setPhotoToDelete(null);
      await onChanged();
    } catch (reason) {
      setPhotoToDelete(null);
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się trwale usunąć zdjęcia.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="place-photo-panel">
      <div className="place-photo-panel-header">
        <strong className="place-photo-panel-title">Zdjęcia miejsca</strong>
        <span className="place-photo-panel-count">{photos.length === 1 ? "1 zdjęcie" : `${photos.length} zdjęć`}</span>
      </div>

      <form className="place-photo-upload" onSubmit={handleUpload}>
        <label>
          Plik
          <input
            accept="image/*"
            key={inputKey}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Podpis
          <input
            maxLength={PHOTO_CAPTION_MAX_LENGTH}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
        </label>
        <button type="submit" disabled={!canUpload}>
          {isUploading ? "Dodawanie..." : "Dodaj zdjęcie"}
        </button>
      </form>

      <div className="place-photo-strip">
        {sortedPhotos.map((photo) => {
          const isCover = place.cover_photo_id === photo.id;
          return (
            <article className="place-photo-card" key={photo.id}>
              <img
                className="place-photo-card-image"
                alt={photo.caption ?? place.title}
                decoding="async"
                loading="lazy"
                src={mediaUrl(photo.thumb_path)}
              />
              <div className="place-photo-card-body">
                <div className="photo-meta-row">
                  <span className={`status-badge status-badge--${photo.status}`}>
                    {ADMIN_MEDIA_STATUS_LABELS[photo.status]}
                  </span>
                  {isCover ? <span className="status-badge status-badge--cover">główne</span> : null}
                </div>
                <p className="place-photo-card-caption">{photo.caption ?? "Brak podpisu"}</p>
                <div className="review-actions">
                  {photo.status === "approved" && !isCover ? (
                    <button
                      className="ghost-button"
                      disabled={isSettingCover}
                      type="button"
                      onClick={() => handleSetCover(photo)}
                    >
                      Ustaw jako główne
                    </button>
                  ) : null}
                  <button className="danger-button" type="button" onClick={() => setPhotoToDelete(photo)}>
                    Usuń
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {photos.length === 0 ? <p className="notice">Brak zdjęć dla tego miejsca.</p> : null}
      </div>

      {photoToDelete ? (
        <SystemModal
          confirmLabel="Usuń trwale"
          isBusy={isDeleting}
          message="Zdjęcie zostanie usunięte z bazy i plików. Tej operacji nie da się cofnąć."
          title="Usunąć zdjęcie?"
          tone="danger"
          onClose={() => setPhotoToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      {errorMessage ? (
        <SystemModal
          confirmLabel="Rozumiem"
          message={errorMessage}
          title="Operacja nie powiodła się"
          tone="error"
          onClose={() => setErrorMessage(null)}
        />
      ) : null}
    </section>
  );
}
