import { FormEvent, useState } from "react";
import { QueryClient } from "@tanstack/react-query";

import { uploadPlaceMemory } from "../../api/media";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import { CLAIM_TOKEN_MIN_LENGTH, hasMemoryFieldErrors, validateMemoryUploadForm } from "./memoryValidation";

type UseMemoryUploadFormParams = {
  claimToken: string;
  onUploaded?: () => void;
  placeId: string;
  queryClient: QueryClient;
};

export function useMemoryUploadForm({ claimToken, onUploaded, placeId, queryClient }: UseMemoryUploadFormParams) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [authorCity, setAuthorCity] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [hasConsent, setHasConsent] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [memoryText, setMemoryText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);

  function resetForm() {
    setAuthorCity("");
    setAuthorName("");
    setAudioFile(null);
    setCaption("");
    setFile(null);
    setFileInputKey((currentKey) => currentKey + 1);
    setHasConsent(false);
    setHasSubmitted(false);
    setMemoryText("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    const nextFieldErrors = validateMemoryUploadForm({
      authorCity,
      authorName,
      audioFile,
      caption,
      file,
      hasConsent,
      memoryText,
    });

    if (!file || claimToken.trim().length < CLAIM_TOKEN_MIN_LENGTH || hasMemoryFieldErrors(nextFieldErrors)) {
      return;
    }

    setIsSaving(true);
    setOperationError(null);
    try {
      await uploadPlaceMemory(placeId, {
        authorCity,
        authorName,
        audioFile,
        caption,
        claimToken,
        consentConfirmed: hasConsent,
        file,
        memoryText,
      });
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["place-memories", placeId] });
      await queryClient.invalidateQueries({ queryKey: ["places-map"] });
      onUploaded?.();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się wysłać pamiątki do moderacji. Sprawdź połączenie i spróbuj ponownie.",
        title: "Nie udało się dodać pamiątki",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const fieldErrors = hasSubmitted
    ? validateMemoryUploadForm({
        authorCity,
        authorName,
        audioFile,
        caption,
        file,
        hasConsent,
        memoryText,
      })
    : {};

  return {
    audioFile,
    authorCity,
    authorName,
    caption,
    fieldErrors,
    file,
    fileInputKey,
    handleSubmit,
    hasConsent,
    isSaving,
    isSubmitDisabled: isSaving || !hasConsent,
    memoryText,
    operationError,
    setAudioFile,
    setAuthorCity,
    setAuthorName,
    setCaption,
    setFile,
    setHasConsent,
    setMemoryText,
    setOperationError,
  };
}
