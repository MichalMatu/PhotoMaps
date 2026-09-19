import { useEffect, useMemo, useRef, useState } from "react";

import { bumpMediaCacheRevision } from "../../api/http";
import {
  deleteAdminPhoto,
  deleteAdminPhotoAudio,
  reviewPhoto,
  setCoverPhoto,
  updateAdminPhoto,
  updateAdminPhotoAudio,
} from "../../api/media";
import { updatePlaceCover } from "../../api/places";
import type { AdminPhoto, Category, City, Place, ReviewFinalStatus, ReviewStatus } from "../../api/types";
import { AdminMediaCityAlbums } from "./AdminMediaCityAlbums";
import { PhotoQueueItem } from "./PhotoQueueItem";
import { PhotoTextEditModal } from "./PhotoTextEditModal";
import { SystemModal } from "./SystemModal";
import { groupAdminMediaPlaceGroupsByCity, groupAdminPhotoAlbumsByPlace } from "./adminMediaGroups";
import type { AdminModerationFilters } from "./adminModerationFilters";
import { photoPayloadFromDraft } from "./placePhotoPanelState";
import { useAdminMediaExpansion } from "./useAdminMediaExpansion";
import { usePhotoQueueData } from "./usePhotoQueueData";
import { usePhotoTextEditDraft } from "./usePhotoTextEditDraft";

type Props = {
  categories: Category[];
  cities: City[];
  moderationFilters: AdminModerationFilters;
  onChanged: () => Promise<void>;
  places: Place[];
  refreshKey: number;
  statusFilter: ReviewStatus | "all";
};

export function PhotoQueue({
  categories,
  cities,
  moderationFilters,
  onChanged,
  places,
  refreshKey,
  statusFilter,
}: Props) {
  const {
    addDescriptionDraftBlock,
    attributionDraft,
    captionDraft,
    clearPhotoTextEditSelection,
    descriptionDraftBlocks,
    editingPhotoId,
    removeDescriptionDraftBlock,
    resetPhotoTextEditDraft,
    setAttributionDraft,
    setCaptionDraft,
    startPhotoTextEdit,
    updateDescriptionDraftBlock,
    updateDescriptionDraftBlockType,
  } = usePhotoTextEditDraft();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const reviewingPhotoIdsRef = useRef(new Set<string>());
  const [reviewingPhotoIds, setReviewingPhotoIds] = useState<Set<string>>(() => new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<AdminPhoto | null>(null);
  const photoFilterOptions = useMemo(
    () => ({
      audio: moderationFilters.audio,
      placeId: moderationFilters.placeId,
      query: moderationFilters.query,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [moderationFilters.audio, moderationFilters.placeId, moderationFilters.query, statusFilter],
  );
  const { albums, isAlbumsLoading, loadAlbums, loadPlacePhotos, loadingPlaceIds, placePhotosById, resetPlacePhotos } =
    usePhotoQueueData({ filterOptions: photoFilterOptions, onError: setErrorMessage });

  const photoGroups = useMemo(
    () =>
      groupAdminPhotoAlbumsByPlace(albums, places, categories).map((group) => ({
        ...group,
        items: placePhotosById[group.placeId] ?? [],
      })),
    [albums, categories, placePhotosById, places],
  );
  const cityGroups = useMemo(() => groupAdminMediaPlaceGroupsByCity(photoGroups, cities), [cities, photoGroups]);
  const [expandedCityId, setExpandedCityId] = useState<string | null>(null);
  const { collapsePlace, expandedPlaceId, togglePlace } = useAdminMediaExpansion(photoGroups);
  const editingPhoto = editingPhotoId
    ? (photoGroups.flatMap((group) => group.items).find((photo) => photo.id === editingPhotoId) ?? null)
    : null;

  useEffect(() => {
    resetPlacePhotos();
    collapsePlace();
    loadAlbums().catch(() => undefined);
  }, [collapsePlace, loadAlbums, refreshKey, resetPlacePhotos]);

  async function handleReview(photoId: string, status: ReviewFinalStatus) {
    if (reviewingPhotoIdsRef.current.has(photoId)) {
      return;
    }

    reviewingPhotoIdsRef.current.add(photoId);
    setReviewingPhotoIds(new Set(reviewingPhotoIdsRef.current));
    try {
      await reviewPhoto(photoId, status);
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu zdjęcia.");
    } finally {
      reviewingPhotoIdsRef.current.delete(photoId);
      setReviewingPhotoIds(new Set(reviewingPhotoIdsRef.current));
    }
  }

  async function handleSetCover(photo: AdminPhoto) {
    try {
      await setCoverPhoto(photo.id);
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się ustawić zdjęcia głównego.");
    }
  }

  async function handleClearCover(photo: AdminPhoto) {
    try {
      await updatePlaceCover(photo.place_id, null);
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zdjąć zdjęcia głównego.");
    }
  }

  function handleTogglePlace(placeId: string) {
    clearPhotoTextEditSelection();
    if (expandedPlaceId !== placeId && !placePhotosById[placeId] && !loadingPlaceIds.has(placeId)) {
      loadPlacePhotos(placeId).catch(() => undefined);
    }
    togglePlace(placeId);
  }

  function handleToggleCity(cityId: string) {
    clearPhotoTextEditSelection();
    collapsePlace();
    setExpandedCityId((currentCityId) => (currentCityId === cityId ? null : cityId));
  }

  function handleStartCaptionEdit(photo: AdminPhoto) {
    startPhotoTextEdit(photo);
  }

  async function handleSaveCaption(photo: AdminPhoto) {
    setIsSavingCaption(true);
    setErrorMessage(null);
    try {
      await updateAdminPhoto(photo.id, photoPayloadFromDraft(captionDraft, descriptionDraftBlocks, attributionDraft));
      resetPhotoTextEditDraft();
      await onChanged();
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
      await onChanged();
    } catch (reason) {
      setPhotoToDelete(null);
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się trwale usunąć zdjęcia.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveAudio(photo: AdminPhoto, audioFile: File) {
    await updateAdminPhotoAudio(photo.id, audioFile);
    bumpMediaCacheRevision();
    await onChanged();
  }

  async function handleDeleteAudio(photo: AdminPhoto) {
    await deleteAdminPhotoAudio(photo.id);
    bumpMediaCacheRevision();
    await onChanged();
  }

  return (
    <>
      <div className="photo-queue">
        {isAlbumsLoading && albums.length === 0 ? <p className="ui-help">Ładowanie albumów zdjęć...</p> : null}
        {!isAlbumsLoading || albums.length > 0 ? (
          <AdminMediaCityAlbums
            countLabel={(count) => (count === 1 ? "1 zdjęcie" : `${count} zdjęć`)}
            emptyMessage="Brak zdjęć dla wybranego statusu."
            expandedCityId={expandedCityId}
            expandedPlaceId={expandedPlaceId}
            groups={cityGroups}
            onToggleCity={handleToggleCity}
            onTogglePlace={handleTogglePlace}
            renderItem={(photo, group) => (
              <PhotoQueueItem
                group={group}
                isReviewing={reviewingPhotoIds.has(photo.id)}
                key={photo.id}
                photo={photo}
                onDelete={setPhotoToDelete}
                onDeleteAudio={handleDeleteAudio}
                onError={setErrorMessage}
                onClearCover={handleClearCover}
                onReview={handleReview}
                onSaveAudio={handleSaveAudio}
                onSetCover={handleSetCover}
                onStartCaptionEdit={handleStartCaptionEdit}
              />
            )}
            renderPanel={(group) => {
              if (loadingPlaceIds.has(group.placeId)) {
                return <p className="ui-help">Ładowanie zdjęć miejsca...</p>;
              }
              if (!placePhotosById[group.placeId]) {
                return null;
              }
              if (group.items.length === 0) {
                return <p className="ui-empty">Brak zdjęć dla wybranego filtra.</p>;
              }
              return group.items.map((photo) => (
                <PhotoQueueItem
                  group={group}
                  isReviewing={reviewingPhotoIds.has(photo.id)}
                  key={photo.id}
                  photo={photo}
                  onDelete={setPhotoToDelete}
                  onDeleteAudio={handleDeleteAudio}
                  onError={setErrorMessage}
                  onClearCover={handleClearCover}
                  onReview={handleReview}
                  onSaveAudio={handleSaveAudio}
                  onSetCover={handleSetCover}
                  onStartCaptionEdit={handleStartCaptionEdit}
                />
              ));
            }}
          />
        ) : null}
      </div>
      {photoToDelete ? (
        <SystemModal
          confirmLabel="Usuń"
          isBusy={isDeleting}
          message={`Zdjęcie zostanie usunięte z bazy, publicznej miniatury i prywatnego oryginału. Tej operacji nie da się cofnąć.`}
          title="Usunąć zdjęcie?"
          tone="danger"
          onClose={() => setPhotoToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
      {editingPhoto ? (
        <PhotoTextEditModal
          attributionDraft={attributionDraft}
          captionDraft={captionDraft}
          descriptionDraftBlocks={descriptionDraftBlocks}
          isSaving={isSavingCaption}
          photo={editingPhoto}
          onAddDescriptionDraftBlock={addDescriptionDraftBlock}
          onAttributionDraftChange={setAttributionDraft}
          onCaptionDraftChange={setCaptionDraft}
          onClose={resetPhotoTextEditDraft}
          onRemoveDescriptionDraftBlock={removeDescriptionDraftBlock}
          onSave={handleSaveCaption}
          onUpdateDescriptionDraftBlock={updateDescriptionDraftBlock}
          onUpdateDescriptionDraftBlockType={updateDescriptionDraftBlockType}
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
