import { FormEvent, useMemo, useState } from "react";

import {
  type Category,
  deleteAdminPhoto,
  reviewPhoto,
  setCoverPhoto,
  type Photo,
  type PhotoStatus,
  type Place,
  updatePlaceCover,
  updateAdminPhoto,
} from "../../api/client";
import { AdminMediaAlbums } from "./AdminMediaAlbums";
import { AdminMediaStatusTabs } from "./AdminMediaStatusTabs";
import { PhotoQueueItem } from "./PhotoQueueItem";
import { PhotoUploadModal } from "./PhotoUploadModal";
import { SystemModal } from "./SystemModal";
import { groupAdminMediaByPlace, selectPhotoAlbumCover } from "./adminMediaGroups";
import { useAdminMediaExpansion } from "./useAdminMediaExpansion";
import { usePhotoUploadModal } from "./usePhotoUploadModal";

type Props = {
  categories: Category[];
  photos: Photo[];
  places: Place[];
  statusCounts: Record<PhotoStatus | "all", number>;
  statusFilter: PhotoStatus | "all";
  onReviewed: () => Promise<void>;
  onStatusFilterChange: (status: PhotoStatus | "all") => void;
};

export function PhotoQueue({
  categories,
  photos,
  places,
  statusCounts,
  statusFilter,
  onReviewed,
  onStatusFilterChange,
}: Props) {
  const [captionDraft, setCaptionDraft] = useState("");
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
  const photoGroups = useMemo(
    () => groupAdminMediaByPlace(photos, places, categories, selectPhotoAlbumCover),
    [categories, photos, places],
  );
  const { expandedPlaceId, togglePlace } = useAdminMediaExpansion(photoGroups);
  const photoUpload = usePhotoUploadModal({
    onReviewed,
    setErrorMessage,
  });

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

  async function handleClearCover(photo: Photo) {
    try {
      await updatePlaceCover(photo.place_id, null);
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zdjąć zdjęcia głównego.");
    }
  }

  function handleTogglePlace(placeId: string) {
    setEditingPhotoId(null);
    togglePlace(placeId);
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
          <AdminMediaStatusTabs
            ariaLabel="Status zdjęć"
            counts={statusCounts}
            value={statusFilter}
            onChange={onStatusFilterChange}
          />
          <button className="photo-add-button" type="button" onClick={photoUpload.open}>
            Dodaj zdjęcie
          </button>
        </div>
        <AdminMediaAlbums
          countLabel={(count) => (count === 1 ? "1 zdjęcie" : `${count} zdjęć`)}
          emptyMessage="Brak zdjęć dla wybranego statusu."
          expandedPlaceId={expandedPlaceId}
          groups={photoGroups}
          onTogglePlace={handleTogglePlace}
          renderItem={(photo, group) => (
            <PhotoQueueItem
              captionDraft={captionDraft}
              group={group}
              isEditing={editingPhotoId === photo.id}
              isSavingCaption={isSavingCaption}
              key={photo.id}
              photo={photo}
              onCancelCaptionEdit={() => {
                setEditingPhotoId(null);
                setCaptionDraft("");
              }}
              onCaptionDraftChange={setCaptionDraft}
              onDelete={setPhotoToDelete}
              onClearCover={handleClearCover}
              onReview={handleReview}
              onSaveCaption={handleSaveCaption}
              onSetCover={handleSetCover}
              onStartCaptionEdit={handleStartCaptionEdit}
            />
          )}
        />
      </div>
      {photoToDelete ? (
        <SystemModal
          confirmLabel="Usuń"
          isBusy={isDeleting}
          message={`Zdjęcie zostanie usunięte z bazy, publicznego pliku, miniatury i prywatnego oryginału. Tej operacji nie da się cofnąć.`}
          title="Usunąć zdjęcie?"
          tone="danger"
          onClose={() => setPhotoToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      {photoUpload.isOpen ? (
        <PhotoUploadModal
          canSubmit={photoUpload.canSubmit}
          caption={photoUpload.caption}
          inputKey={photoUpload.inputKey}
          isUploading={photoUpload.isUploading}
          placeId={photoUpload.placeId}
          places={places}
          onCaptionChange={photoUpload.setCaption}
          onClose={photoUpload.close}
          onConfirm={photoUpload.submit}
          onFileChange={photoUpload.setFile}
          onPlaceChange={photoUpload.setPlaceId}
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
