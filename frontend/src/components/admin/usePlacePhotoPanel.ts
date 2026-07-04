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
import type { AdminPhoto, ContentBlock, ContentBlockType, Place, ReviewFinalStatus } from "../../api/types";
import { emptyContentBlock } from "../content/contentBlocks";
import { validateAudioFile } from "../ui/audioAttachment";
import { uploadAndApproveAdminPlacePhoto } from "./adminPhotoUpload";
import { canSubmitPhotoUpload } from "./photoUploadState";
import {
  EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  type PhotoAttributionDraft,
  photoAttributionDraftFromPhoto,
  photoPayloadFromDraft,
  sortPlacePhotosForPanel,
} from "./placePhotoPanelState";
import type { RedactionPolygon } from "./mediaRedactionGeometry";

type UsePlacePhotoPanelParams = {
  onChanged: () => Promise<void>;
  photos: AdminPhoto[];
  place: Place;
};

export function usePlacePhotoPanel({ onChanged, photos, place }: UsePlacePhotoPanelParams) {
  const [caption, setCaption] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [descriptionBlocks, setDescriptionBlocks] = useState<ContentBlock[]>([]);
  const [descriptionDraftBlocks, setDescriptionDraftBlocks] = useState<ContentBlock[]>([]);
  const [attributionDraft, setAttributionDraft] = useState<PhotoAttributionDraft>({
    ...EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  });
  const [uploadAttributionDraft, setUploadAttributionDraft] = useState<PhotoAttributionDraft>({
    ...EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  });
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApplyingRedaction, setIsApplyingRedaction] = useState(false);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [isSettingCover, setIsSettingCover] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<AdminPhoto | null>(null);
  const [photoToRedact, setPhotoToRedact] = useState<AdminPhoto | null>(null);
  const sortedPhotos = useMemo(
    () => sortPlacePhotosForPanel(photos, place.cover_photo_id),
    [photos, place.cover_photo_id],
  );
  const audioError = validateAudioFile(audioFile);
  const canUpload = canSubmitPhotoUpload({ file, isUploading, placeId: place.id }) && !audioError;

  function resetUpload() {
    setAudioFile(null);
    setCaption("");
    setDescriptionBlocks([]);
    setUploadAttributionDraft({ ...EMPTY_PHOTO_ATTRIBUTION_DRAFT });
    setFile(null);
    setInputKey((currentKey) => currentKey + 1);
  }

  function openUploadModal() {
    setErrorMessage(null);
    setIsUploadModalOpen(true);
  }

  function closeUploadModal() {
    if (isUploading) {
      return;
    }
    setIsUploadModalOpen(false);
    resetUpload();
  }

  async function handleUpload() {
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      if (audioError) {
        setErrorMessage(audioError);
        return;
      }
      await uploadAndApproveAdminPlacePhoto(
        place.id,
        file,
        photoPayloadFromDraft(caption, descriptionBlocks, uploadAttributionDraft),
        audioFile,
      );
      resetUpload();
      setIsUploadModalOpen(false);
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się dodać zdjęcia.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetCover(photo: AdminPhoto) {
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

  async function handleClearCover() {
    setErrorMessage(null);
    setIsSettingCover(true);
    try {
      await updatePlaceCover(place.id, null);
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zdjąć zdjęcia głównego.");
    } finally {
      setIsSettingCover(false);
    }
  }

  async function handleReview(photoId: string, status: ReviewFinalStatus) {
    setErrorMessage(null);
    try {
      await reviewPhoto(photoId, status);
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zmienić statusu zdjęcia.");
    }
  }

  async function handleApplyRedaction(redactions: RedactionPolygon[]) {
    if (!photoToRedact) {
      return;
    }

    setErrorMessage(null);
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

  function handleStartCaptionEdit(photo: AdminPhoto) {
    setCaptionDraft(photo.caption ?? "");
    setDescriptionDraftBlocks(photo.description_blocks);
    setAttributionDraft(photoAttributionDraftFromPhoto(photo));
    setEditingPhotoId(photo.id);
  }

  function handleCancelCaptionEdit() {
    setEditingPhotoId(null);
    setCaptionDraft("");
    setDescriptionDraftBlocks([]);
    setAttributionDraft({ ...EMPTY_PHOTO_ATTRIBUTION_DRAFT });
  }

  async function handleSaveCaption(photo: AdminPhoto) {
    setErrorMessage(null);
    setIsSavingCaption(true);
    try {
      await updateAdminPhoto(photo.id, photoPayloadFromDraft(captionDraft, descriptionDraftBlocks, attributionDraft));
      handleCancelCaptionEdit();
      await onChanged();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się zapisać podpisu zdjęcia.");
    } finally {
      setIsSavingCaption(false);
    }
  }

  async function handleSaveAudio(photo: AdminPhoto, nextAudioFile: File) {
    await updateAdminPhotoAudio(photo.id, nextAudioFile);
    bumpMediaCacheRevision();
    await onChanged();
  }

  async function handleDeleteAudio(photo: AdminPhoto) {
    await deleteAdminPhotoAudio(photo.id);
    bumpMediaCacheRevision();
    await onChanged();
  }

  function addDescriptionBlock(type: ContentBlockType) {
    setDescriptionBlocks((currentBlocks) => [...currentBlocks, emptyContentBlock(type)]);
  }

  function updateDescriptionBlock(index: number, nextBlock: ContentBlock) {
    setDescriptionBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => (currentIndex === index ? nextBlock : currentBlock)),
    );
  }

  function updateDescriptionBlockType(index: number, type: ContentBlockType) {
    setDescriptionBlocks((currentBlocks) =>
      currentBlocks.map((currentBlock, currentIndex) => {
        if (currentIndex !== index) return currentBlock;
        const nextBlock = emptyContentBlock(type);
        return { ...nextBlock, text: currentBlock.text };
      }),
    );
  }

  function removeDescriptionBlock(index: number) {
    setDescriptionBlocks((currentBlocks) => currentBlocks.filter((_block, currentIndex) => currentIndex !== index));
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

  function addDescriptionDraftBlock(type: ContentBlockType) {
    setDescriptionDraftBlocks((currentBlocks) => [...currentBlocks, emptyContentBlock(type)]);
  }

  function removeDescriptionDraftBlock(index: number) {
    setDescriptionDraftBlocks((currentBlocks) =>
      currentBlocks.filter((_block, currentIndex) => currentIndex !== index),
    );
  }

  return {
    addDescriptionBlock,
    addDescriptionDraftBlock,
    audioError,
    audioFile,
    attributionDraft,
    canUpload,
    caption,
    captionDraft,
    closeUploadModal,
    descriptionBlocks,
    descriptionDraftBlocks,
    editingPhotoId,
    errorMessage,
    file,
    handleApplyRedaction,
    handleCancelCaptionEdit,
    handleClearCover,
    handleConfirmDelete,
    handleDeleteAudio,
    handleSaveAudio,
    handleSaveCaption,
    handleReview,
    handleSetCover,
    handleStartCaptionEdit,
    handleUpload,
    inputKey,
    isDeleting,
    isApplyingRedaction,
    isSavingCaption,
    isSettingCover,
    isUploadModalOpen,
    isUploading,
    openUploadModal,
    photoToDelete,
    photoToRedact,
    removeDescriptionBlock,
    removeDescriptionDraftBlock,
    setAudioFile,
    setAttributionDraft,
    setCaption,
    setCaptionDraft,
    setErrorMessage,
    setFile,
    setPhotoToDelete,
    setPhotoToRedact,
    setUploadAttributionDraft,
    sortedPhotos,
    updateDescriptionBlock,
    updateDescriptionBlockType,
    updateDescriptionDraftBlock,
    updateDescriptionDraftBlockType,
    uploadAttributionDraft,
  };
}
