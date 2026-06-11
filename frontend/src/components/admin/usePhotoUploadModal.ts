import { useState } from "react";

import { uploadPlacePhoto } from "../../api/client";
import { canSubmitPhotoUpload } from "./photoUploadState";

const PHOTO_CONSENT_CONFIRMED = true;

type UsePhotoUploadModalArgs = {
  onReviewed: () => Promise<void>;
  setErrorMessage: (message: string | null) => void;
};

export function usePhotoUploadModal({ onReviewed, setErrorMessage }: UsePhotoUploadModalArgs) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const canSubmit = canSubmitPhotoUpload({ file, isUploading, placeId });

  function reset() {
    setCaption("");
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

  async function submit() {
    if (!file || !placeId) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    try {
      await uploadPlacePhoto(placeId, file, caption, PHOTO_CONSENT_CONFIRMED);
      setIsOpen(false);
      reset();
      await onReviewed();
    } catch (reason) {
      setErrorMessage(reason instanceof Error ? reason.message : "Nie udało się dodać zdjęcia.");
    } finally {
      setIsUploading(false);
    }
  }

  return {
    canSubmit,
    caption,
    close,
    inputKey,
    isOpen,
    isUploading,
    open: () => setIsOpen(true),
    placeId,
    setCaption,
    setFile,
    setPlaceId,
    submit,
  };
}
