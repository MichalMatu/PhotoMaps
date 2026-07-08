import { useCallback, useEffect, useMemo, useState } from "react";

import { bumpMediaCacheRevision } from "../../api/http";
import {
  deleteAdminPhoto,
  deleteAdminPhotoAudio,
  getAdminPhotoAlbums,
  getAdminPlacePhotos,
  redactAdminPhoto,
  reviewPhoto,
  setCoverPhoto,
  updateAdminPhoto,
  updateAdminPhotoAudio,
} from "../../api/media";
import { updatePlaceCover } from "../../api/places";
import type {
  AdminPhoto,
  Category,
  City,
  ContentBlock,
  ContentBlockType,
  Place,
  ReviewFinalStatus,
  ReviewStatus,
} from "../../api/types";
import { emptyContentBlock } from "../content/contentBlocks";
import { AdminMediaCityAlbums } from "./AdminMediaCityAlbums";
import { MediaRedactionModal } from "./MediaRedactionModal";
import { PhotoQueueItem } from "./PhotoQueueItem";
import { PhotoTextEditModal } from "./PhotoTextEditModal";
import { SystemModal } from "./SystemModal";
import { groupAdminMediaPlaceGroupsByCity, groupAdminPhotoAlbumsByPlace } from "./adminMediaGroups";
import type { AdminModerationFilters } from "./adminModerationFilters";
import type { RedactionPolygon } from "./mediaRedactionGeometry";
import {
  EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  type PhotoAttributionDraft,
  photoAttributionDraftFromPhoto,
  photoPayloadFromDraft,
} from "./placePhotoPanelState";
import { useAdminMediaExpansion } from "./useAdminMediaExpansion";

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
  const [albums, setAlbums] = useState<Awaited<ReturnType<typeof getAdminPhotoAlbums>>>([]);
  const [captionDraft, setCaptionDraft] = useState("");
  const [descriptionDraftBlocks, setDescriptionDraftBlocks] = useState<ContentBlock[]>([]);
  const [attributionDraft, setAttributionDraft] = useState<PhotoAttributionDraft>({
    ...EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  });
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAlbumsLoading, setIsAlbumsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyingRedaction, setIsApplyingRedaction] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [loadingPlaceIds, setLoadingPlaceIds] = useState<Set<string>>(() => new Set());
  const [placePhotosById, setPlacePhotosById] = useState<Record<string, AdminPhoto[]>>({});
  const [photoToDelete, setPhotoToDelete] = useState<AdminPhoto | null>(null);
  const [photoToRedact, setPhotoToRedact] = useState<AdminPhoto | null>(null);
  const photoFilterOptions = useMemo(
    () => ({
      audio: moderationFilters.audio,
      placeId: moderationFilters.placeId,
      query: moderationFilters.query,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [moderationFilters.audio, moderationFilters.placeId, moderationFilters.query, statusFilter],
  );

  const loadAlbums = useCallback(async () => {
    setIsAlbumsLoading(true);
    try {
      const nextAlbums = await getAdminPhotoAlbums(photoFilterOptions);
      setAlbums(nextAlbums);
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się pobrać albumów zdjęć.");
    } finally {
      setIsAlbumsLoading(false);
    }
  }, [photoFilterOptions]);

  const loadPlacePhotos = useCallback(
    async (placeId: string) => {
      setLoadingPlaceIds((currentIds) => new Set(currentIds).add(placeId));
      try {
        const nextPhotos = await getAdminPlacePhotos(placeId, photoFilterOptions);
        setPlacePhotosById((currentPhotos) => ({ ...currentPhotos, [placeId]: nextPhotos }));
      } catch (reason) {
        setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się pobrać zdjęć miejsca.");
      } finally {
        setLoadingPlaceIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(placeId);
          return nextIds;
        });
      }
    },
    [photoFilterOptions],
  );

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
    setPlacePhotosById({});
    collapsePlace();
    loadAlbums().catch(() => undefined);
  }, [collapsePlace, loadAlbums, refreshKey]);

  async function handleReview(photoId: string, status: ReviewFinalStatus) {
    try {
      await reviewPhoto(photoId, status);
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu zdjęcia.");
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
    setEditingPhotoId(null);
    setDescriptionDraftBlocks([]);
    if (expandedPlaceId !== placeId && !placePhotosById[placeId] && !loadingPlaceIds.has(placeId)) {
      loadPlacePhotos(placeId).catch(() => undefined);
    }
    togglePlace(placeId);
  }

  function handleToggleCity(cityId: string) {
    setEditingPhotoId(null);
    setDescriptionDraftBlocks([]);
    collapsePlace();
    setExpandedCityId((currentCityId) => (currentCityId === cityId ? null : cityId));
  }

  function handleStartCaptionEdit(photo: AdminPhoto) {
    setCaptionDraft(photo.caption ?? "");
    setDescriptionDraftBlocks(photo.description_blocks);
    setAttributionDraft(photoAttributionDraftFromPhoto(photo));
    setEditingPhotoId(photo.id);
  }

  async function handleSaveCaption(photo: AdminPhoto) {
    setIsSavingCaption(true);
    setErrorMessage(null);
    try {
      await updateAdminPhoto(photo.id, photoPayloadFromDraft(captionDraft, descriptionDraftBlocks, attributionDraft));
      setEditingPhotoId(null);
      setCaptionDraft("");
      setDescriptionDraftBlocks([]);
      setAttributionDraft({ ...EMPTY_PHOTO_ATTRIBUTION_DRAFT });
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

  async function handleApplyRedaction(redactions: RedactionPolygon[]) {
    if (!photoToRedact) {
      return;
    }

    setIsApplyingRedaction(true);
    try {
      await redactAdminPhoto(photoToRedact.id, {
        polygons: redactions.map((redaction) => redaction.points),
        rectangles: [],
      });
      bumpMediaCacheRevision();
      setPhotoToRedact(null);
      await onChanged();
    } catch (reason) {
      throw reason instanceof Error ? reason : new Error("Nie udało się zapisać redakcji zdjęcia.");
    } finally {
      setIsApplyingRedaction(false);
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

  function addDescriptionDraftBlock(type: ContentBlockType) {
    setDescriptionDraftBlocks((currentBlocks) => [...currentBlocks, emptyContentBlock(type)]);
  }

  function updateDescriptionDraftBlock(index: number, nextBlock: ContentBlock) {
    setDescriptionDraftBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => (currentIndex === index ? nextBlock : currentBlock)),
    );
  }

  function updateDescriptionDraftBlockType(index: number, type: ContentBlockType) {
    setDescriptionDraftBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => {
        if (currentIndex !== index) return currentBlock;
        const nextBlock = emptyContentBlock(type);
        return { ...nextBlock, text: currentBlock.text };
      }),
    );
  }

  function removeDescriptionDraftBlock(index: number) {
    setDescriptionDraftBlocks((currentBlocks) =>
      currentBlocks.filter((_block, currentIndex) => currentIndex !== index),
    );
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
                key={photo.id}
                photo={photo}
                onDelete={setPhotoToDelete}
                onDeleteAudio={handleDeleteAudio}
                onError={setErrorMessage}
                onRedact={setPhotoToRedact}
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
                  key={photo.id}
                  photo={photo}
                  onDelete={setPhotoToDelete}
                  onDeleteAudio={handleDeleteAudio}
                  onError={setErrorMessage}
                  onRedact={setPhotoToRedact}
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
          message={`Zdjęcie zostanie usunięte z bazy, publicznego pliku, miniatury i prywatnego oryginału. Tej operacji nie da się cofnąć.`}
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
          onClose={() => {
            setEditingPhotoId(null);
            setCaptionDraft("");
            setDescriptionDraftBlocks([]);
            setAttributionDraft({ ...EMPTY_PHOTO_ATTRIBUTION_DRAFT });
          }}
          onRemoveDescriptionDraftBlock={removeDescriptionDraftBlock}
          onSave={handleSaveCaption}
          onUpdateDescriptionDraftBlock={updateDescriptionDraftBlock}
          onUpdateDescriptionDraftBlockType={updateDescriptionDraftBlockType}
        />
      ) : null}
      {photoToRedact ? (
        <MediaRedactionModal
          isApplying={isApplyingRedaction}
          kind="photo"
          media={photoToRedact}
          onApply={handleApplyRedaction}
          onClose={() => setPhotoToRedact(null)}
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
