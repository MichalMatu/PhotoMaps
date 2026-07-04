import { useMemo, useState } from "react";

import { bumpMediaCacheRevision } from "../../api/http";
import {
  deleteAdminPhoto,
  deleteAdminPhotoAudio,
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
} from "../../api/types";
import { emptyContentBlock } from "../content/contentBlocks";
import { AdminMediaCityAlbums } from "./AdminMediaCityAlbums";
import { MediaRedactionModal } from "./MediaRedactionModal";
import { PhotoQueueItem } from "./PhotoQueueItem";
import { PhotoTextEditModal } from "./PhotoTextEditModal";
import { SystemModal } from "./SystemModal";
import { groupAdminMediaByPlace, groupAdminMediaPlaceGroupsByCity, selectPhotoAlbumCover } from "./adminMediaGroups";
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
  photos: AdminPhoto[];
  places: Place[];
  onReviewed: () => Promise<void>;
};

export function PhotoQueue({ categories, cities, photos, places, onReviewed }: Props) {
  const [captionDraft, setCaptionDraft] = useState("");
  const [descriptionDraftBlocks, setDescriptionDraftBlocks] = useState<ContentBlock[]>([]);
  const [attributionDraft, setAttributionDraft] = useState<PhotoAttributionDraft>({
    ...EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  });
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyingRedaction, setIsApplyingRedaction] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<AdminPhoto | null>(null);
  const [photoToRedact, setPhotoToRedact] = useState<AdminPhoto | null>(null);
  const photoGroups = useMemo(
    () => groupAdminMediaByPlace(photos, places, categories, selectPhotoAlbumCover),
    [categories, photos, places],
  );
  const cityGroups = useMemo(() => groupAdminMediaPlaceGroupsByCity(photoGroups, cities), [cities, photoGroups]);
  const [expandedCityId, setExpandedCityId] = useState<string | null>(null);
  const { collapsePlace, expandedPlaceId, togglePlace } = useAdminMediaExpansion(photoGroups);
  const editingPhoto = editingPhotoId
    ? (photoGroups.flatMap((group) => group.items).find((photo) => photo.id === editingPhotoId) ?? null)
    : null;

  async function handleReview(photoId: string, status: ReviewFinalStatus) {
    try {
      await reviewPhoto(photoId, status);
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu zdjęcia.");
    }
  }

  async function handleSetCover(photo: AdminPhoto) {
    try {
      await setCoverPhoto(photo.id);
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się ustawić zdjęcia głównego.");
    }
  }

  async function handleClearCover(photo: AdminPhoto) {
    try {
      await updatePlaceCover(photo.place_id, null);
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zdjąć zdjęcia głównego.");
    }
  }

  function handleTogglePlace(placeId: string) {
    setEditingPhotoId(null);
    setDescriptionDraftBlocks([]);
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
      await onReviewed();
    } catch (reason) {
      throw reason instanceof Error ? reason : new Error("Nie udało się zapisać redakcji zdjęcia.");
    } finally {
      setIsApplyingRedaction(false);
    }
  }

  async function handleSaveAudio(photo: AdminPhoto, audioFile: File) {
    await updateAdminPhotoAudio(photo.id, audioFile);
    bumpMediaCacheRevision();
    await onReviewed();
  }

  async function handleDeleteAudio(photo: AdminPhoto) {
    await deleteAdminPhotoAudio(photo.id);
    bumpMediaCacheRevision();
    await onReviewed();
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
