import { useState } from "react";

import {
  deleteAdminPhoto,
  mediaUrl,
  reviewPhoto,
  setCoverPhoto,
  type Photo,
  type PhotoStatus,
  type Place,
} from "../../api/client";
import { SystemModal } from "./SystemModal";

type Props = {
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

export function PhotoQueue({ photos, places, statusCounts, statusFilter, onReviewed, onStatusFilterChange }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const placeById = new Map(places.map((place) => [place.id, place]));

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
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się trwale usunąć zdjęcia.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="photo-queue">
        <div className="section-heading">
          <h2>Zdjęcia</h2>
          <span>{photos.length}</span>
        </div>
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
        {photos.length === 0 ? <p className="notice">Brak zdjęć dla wybranego statusu.</p> : null}
        <div className="photo-grid">
          {photos.map((photo) => {
            const place = placeById.get(photo.place_id);
            const isCover = place?.cover_photo_id === photo.id;
            return (
              <article className="photo-review-item" key={photo.id}>
                <img alt={photo.caption ?? place?.title ?? "Zdjęcie miejsca"} src={mediaUrl(photo.thumb_path)} />
                <div>
                  <strong>{place?.title ?? photo.place_id}</strong>
                  <div className="photo-meta-row">
                    <span className={`status-badge status-badge--${photo.status}`}>{STATUS_LABELS[photo.status]}</span>
                    {isCover ? <span className="status-badge status-badge--cover">główne</span> : null}
                  </div>
                  {photo.caption ? <p>{photo.caption}</p> : null}
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
          })}
        </div>
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
