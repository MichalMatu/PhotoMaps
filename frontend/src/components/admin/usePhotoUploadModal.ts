import { useState } from "react";

import type { ContentBlock, ContentBlockType } from "../../api/types";
import { emptyContentBlock } from "../content/contentBlocks";
import { validateAudioFile } from "../ui/audioAttachment";
import { uploadAndApproveAdminPlacePhoto } from "./adminPhotoUpload";
import { canSubmitPhotoUpload } from "./photoUploadState";
import {
  EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  type PhotoAttributionDraft,
  photoPayloadFromDraft,
} from "./placePhotoPanelState";

type UsePhotoUploadModalArgs = {
  onReviewed: () => Promise<void>;
  setErrorMessage: (message: string | null) => void;
};

export function usePhotoUploadModal({ onReviewed, setErrorMessage }: UsePhotoUploadModalArgs) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [attributionDraft, setAttributionDraft] = useState<PhotoAttributionDraft>({
    ...EMPTY_PHOTO_ATTRIBUTION_DRAFT,
  });
  const [caption, setCaption] = useState("");
  const [cityId, setCityIdState] = useState("");
  const [descriptionBlocks, setDescriptionBlocks] = useState<ContentBlock[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const audioError = validateAudioFile(audioFile);
  const canSubmit = canSubmitPhotoUpload({ file, isUploading, placeId }) && !audioError;

  function reset() {
    setAudioFile(null);
    setAttributionDraft({ ...EMPTY_PHOTO_ATTRIBUTION_DRAFT });
    setCaption("");
    setCityIdState("");
    setDescriptionBlocks([]);
    setFile(null);
    setPlaceId("");
    setInputKey((currentKey) => currentKey + 1);
  }

  function close() {
    if (isUploading) {
      return;
    }
    setIsOpen(false);
    reset();
  }

  function setCityId(nextCityId: string) {
    setCityIdState(nextCityId);
    setPlaceId("");
  }

  async function submit() {
    if (!file || !placeId) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      if (audioError) {
        setErrorMessage(audioError);
        return;
      }
      await uploadAndApproveAdminPlacePhoto(
        placeId,
        file,
        photoPayloadFromDraft(caption, descriptionBlocks, attributionDraft),
        audioFile,
      );
      setIsOpen(false);
      reset();
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się dodać zdjęcia.");
    } finally {
      setIsUploading(false);
    }
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

  return {
    addDescriptionBlock,
    audioFile,
    audioError,
    attributionDraft,
    canSubmit,
    caption,
    cityId,
    descriptionBlocks,
    file,
    close,
    inputKey,
    isOpen,
    isUploading,
    open: () => setIsOpen(true),
    placeId,
    removeDescriptionBlock,
    setAudioFile,
    setAttributionDraft,
    setCaption,
    setCityId,
    setFile,
    setPlaceId,
    submit,
    updateDescriptionBlock,
    updateDescriptionBlockType,
  };
}
