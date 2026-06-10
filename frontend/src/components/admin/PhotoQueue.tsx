import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  type Category,
  deleteAdminPhoto,
  mediaUrl,
  reviewPhoto,
  setCoverPhoto,
  type Photo,
  type PhotoStatus,
  type Place,
  updateAdminPhoto,
  uploadPlacePhoto,
} from "../../api/client";
import { AdminMediaAlbums } from "./AdminMediaAlbums";
import { SystemModal } from "./SystemModal";
import { groupAdminMediaByPlace, selectPhotoAlbumCover } from "./adminMediaGroups";
import { canSubmitPhotoUpload } from "./photoUploadState";

type Props = {
  categories: Category[];
  photos: Photo[];
  places: Place[];
  statusCounts: Record<PhotoStatus | "all", number>;
  statusFilter: PhotoStatus | "all";
  onReviewed: () => Promise<void>;
  onStatusFilterChange: (status: PhotoStatus | "all") => void;
};

const STATUS_FILTERS: Array<{ label: string; value: PhotoStatus | "all" }> = [
  { label: "Wszystkie", value: "all" },
  { label: "Do sprawdzenia", value: "pending" },
  { label: "Zatwierdzone", value: "approved" },
  { label: "Odrzucone", value: "rejected" },
];

const STATUS_LABELS: Record<PhotoStatus, string> = {
  pending: "do sprawdzenia",
  approved: "zatwierdzone",
  rejected: "odrzucone",
};

const PHOTO_CONSENT_CONFIRMED = true;
const PHOTO_CAPTION_MAX_LENGTH = 120;

export function PhotoQueue({ categories, photos, places, statusCounts, statusFilter, onReviewed, onStatusFilterChange }: Props) {
  const [caption, setCaption] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPlaceId, setNewPhotoPlaceId] = useState("");
  const [photoUploadInputKey, setPhotoUploadInputKey] = useState(0);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const photoGroups = useMemo(
    () => groupAdminMediaByPlace(photos, places, categories, selectPhotoAlbumCover),
    [categories, photos, places],
  );
  const canSubmitUpload = canSubmitPhotoUpload({
    file: newPhotoFile,
    isUploading,
    placeId: newPhotoPlaceId,
  });

  useEffect(() => {
    setExpandedPlaceId((currentPlaceId) => {
      if (currentPlaceId && photoGroups.some((group) => group.placeId === currentPlaceId)) {
        return currentPlaceId;
      }
      return null;
    });
  }, [photoGroups]);

  function resetUploadForm() {
    setCaption("");
    setNewPhotoFile(null);
    setNewPhotoPlaceId("");
    setPhotoUploadInputKey((currentKey) => currentKey + 1);
  }

  function handleCloseUploadModal() {
    if (isUploading) {
      return;
    }
    setIsUploadModalOpen(false);
    resetUploadForm();
  }

  async function handleUploadPhoto() {
    if (!newPhotoFile || !newPhotoPlaceId) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      await uploadPlacePhoto(newPhotoPlaceId, newPhotoFile, caption, PHOTO_CONSENT_CONFIRMED);
      setIsUploadModalOpen(false);
      resetUploadForm();
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się dodać zdjęcia.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleReview(photoId: string, status: "approved" | "rejected") {
    try {
      await reviewPhoto(photoId, status);
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu zdjęcia.");
    }
  }

  async function handleSetCover(photo: Photo) {
    try {
      await setCoverPhoto(photo.id);
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się ustawić zdjęcia głównego.");
    }
  }

  function handleTogglePlace(placeId: string) {
    setEditingPhotoId(null);
    setExpandedPlaceId((currentPlaceId) => (currentPlaceId === placeId ? null : placeId));
  }

  function handleStartCaptionEdit(photo: Photo) {
    setCaptionDraft(photo.caption ?? "");
    setEditingPhotoId(photo.id);
  }

  async function handleSaveCaption(event: FormEvent<HTMLFormElement>, photoId: string) {
    event.preventDefault();
    setIsSavingCaption(true);
    setErrorMessage(null);
    try {
      await updateAdminPhoto(photoId, { caption: captionDraft.trim() || null });
      setEditingPhotoId(null);
      setCaptionDraft("");
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zapisać podpisu zdjęcia.");
    } finally {
      setIsSavingCaption(false);
    }
  }

  async function handleConfirmDelete() {
    if (!photoToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAdminPhoto(photoToDelete.id);
      setPhotoToDelete(null);
      await onReviewed();
    } catch (reason) {
      setPhotoToDelete(null);
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się trwale usunąć zdjęcia.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="photo-queue">
        <div className="photo-queue-toolbar">
          <div className="status-tabs" role="tablist" aria-label="Status zdjęć">
            {STATUS_FILTERS.map((filter) => (
              <button
                className={statusFilter === filter.value ? "status-tab is-active" : "status-tab"}
                key={filter.value}
                type="button"
                onClick={() => onStatusFilterChange(filter.value)}
              >
                {filter.label} <span>{statusCounts[filter.value]}</span>
              </button>
            ))}
          </div>
          <button className="photo-add-button" type="button" onClick={() => setIsUploadModalOpen(true)}>
            Dodaj zdjęcie
          </button>
        </div>
        <AdminMediaAlbums
          countLabel={(count) => (count === 1 ? "1 zdjęcie" : `${count} zdjęć`)}
          emptyMessage="Brak zdjęć dla wybranego statusu."
          expandedPlaceId={expandedPlaceId}
          groups={photoGroups}
          onTogglePlace={handleTogglePlace}
          renderItem={(photo, group) => {
            const isCover = group.place?.cover_photo_id === photo.id;
            return (
              <article className="admin-media-item" key={photo.id}>
                <img alt={photo.caption ?? group.title} decoding="async" loading="lazy" src={mediaUrl(photo.thumb_path)} />
                <div className="admin-media-item-body">
                  <div className="photo-meta-row">
                    <span className={`status-badge status-badge--${photo.status}`}>{STATUS_LABELS[photo.status]}</span>
                    {isCover ? <span className="status-badge status-badge--cover">główne</span> : null}
                  </div>
                  {editingPhotoId === photo.id ? (
                    <form className="admin-media-edit-form" onSubmit={(event) => handleSaveCaption(event, photo.id)}>
                      <label>
                        Podpis
                        <input
                          maxLength={PHOTO_CAPTION_MAX_LENGTH}
                          value={captionDraft}
                          onChange={(event) => setCaptionDraft(event.target.value)}
                        />
                      </label>
                      <div className="review-actions">
                        <button type="submit" disabled={isSavingCaption}>
                          {isSavingCaption ? "Zapisywanie..." : "Zapisz"}
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => {
                            setEditingPhotoId(null);
                            setCaptionDraft("");
                          }}
                        >
                          Anuluj
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="admin-media-caption">{photo.caption ?? "Brak podpisu"}</p>
                      <button className="ghost-button admin-media-link-button" type="button" onClick={() => handleStartCaptionEdit(photo)}>
                        Edytuj podpis
                      </button>
                    </>
                  )}
                  <div className="review-actions">
                    {photo.status !== "approved" ? (
                      <button type="button" onClick={() => handleReview(photo.id, "approved")}>
                        {photo.status === "rejected" ? "Przywróć" : "Zatwierdź"}
                      </button>
                    ) : null}
                    {photo.status !== "rejected" ? (
                      <button className="secondary-button" type="button" onClick={() => handleReview(photo.id, "rejected")}>
                        {photo.status === "approved" ? "Ukryj" : "Odrzuć"}
                      </button>
                    ) : null}
                    {photo.status === "approved" && !isCover ? (
                      <button className="ghost-button" type="button" onClick={() => handleSetCover(photo)}>
                        Ustaw jako główne
                      </button>
                    ) : null}
                    <button className="danger-button" type="button" onClick={() => setPhotoToDelete(photo)}>
                      Usuń trwale
                    </button>
                  </div>
                </div>
              </article>
            );
          }}
        />
      </div>
      {photoToDelete ? (
        <SystemModal
          confirmLabel="Usuń trwale"
          isBusy={isDeleting}
          message={`Zdjęcie zostanie usunięte z bazy, publicznego pliku, miniatury i prywatnego oryginału. Tej operacji nie da się cofnąć.`}
          title="Usunąć zdjęcie?"
          tone="danger"
          onClose={() => setPhotoToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      {isUploadModalOpen ? (
        <SystemModal
          cancelLabel="Zamknij"
          confirmDisabled={!canSubmitUpload}
          confirmLabel="Dodaj zdjęcie"
          eyebrow="Zdjęcia"
          isBusy={isUploading}
          title="Dodaj zdjęcie"
          onClose={handleCloseUploadModal}
          onConfirm={handleUploadPhoto}
        >
          <div className="admin-photo-upload admin-photo-upload--modal">
            <label>
              Miejsce
              <select value={newPhotoPlaceId} onChange={(event) => setNewPhotoPlaceId(event.target.value)} required>
                <option value="">Wybierz miejsce</option>
                {places.map((place) => (
                  <option value={place.id} key={place.id}>
                    {place.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Zdjęcie
              <input
                accept="image/*"
                key={photoUploadInputKey}
                type="file"
                onChange={(event) => setNewPhotoFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label>
              Podpis
              <input maxLength={PHOTO_CAPTION_MAX_LENGTH} value={caption} onChange={(event) => setCaption(event.target.value)} />
            </label>
          </div>
        </SystemModal>
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
    </>
  );
}
