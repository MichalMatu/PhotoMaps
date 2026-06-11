import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { deleteMemory, updateMemory, verifyMemoryClaim, type Memory } from "../../api/client";
import {
  hasMemoryFieldErrors,
  validateClaimToken,
  validateMemoryEditForm,
  type MemoryFieldErrors,
} from "../places/memoryValidation";
import { errorDetails, type OperationError } from "../ui/ErrorModal";

type UseMemoryOwnerToolsArgs = {
  itemKey: string;
  memory: Memory | null;
  onDeleted: () => void;
  placeId: string;
};

export type MemoryOwnerToolsModel = {
  claimFieldErrors: MemoryFieldErrors;
  claimToken: string;
  draftAuthorCity: string;
  draftAuthorName: string;
  draftCaption: string;
  draftMemoryText: string;
  editFieldErrors: MemoryFieldErrors;
  handleDeleteMemory: () => Promise<void>;
  handleToggleOwnerTools: () => void;
  handleUpdateMemory: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleVerifyClaim: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isClaimVerified: boolean;
  isOwnerSaving: boolean;
  isOwnerToolsOpen: boolean;
  operationError: OperationError | null;
  ownerSuccessMessage: string | null;
  setClaimToken: (value: string) => void;
  setDraftAuthorCity: (value: string) => void;
  setDraftAuthorName: (value: string) => void;
  setDraftCaption: (value: string) => void;
  setDraftMemoryText: (value: string) => void;
  setOperationError: (value: OperationError | null) => void;
};

export function useMemoryOwnerTools({
  itemKey,
  memory,
  onDeleted,
  placeId,
}: UseMemoryOwnerToolsArgs): MemoryOwnerToolsModel {
  const queryClient = useQueryClient();
  const [claimToken, setClaimToken] = useState("");
  const [draftAuthorCity, setDraftAuthorCity] = useState("");
  const [draftAuthorName, setDraftAuthorName] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftMemoryText, setDraftMemoryText] = useState("");
  const [hasClaimSubmitted, setHasClaimSubmitted] = useState(false);
  const [hasEditSubmitted, setHasEditSubmitted] = useState(false);
  const [isClaimVerified, setIsClaimVerified] = useState(false);
  const [isOwnerSaving, setIsOwnerSaving] = useState(false);
  const [isOwnerToolsOpen, setIsOwnerToolsOpen] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [ownerSuccessMessage, setOwnerSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setClaimToken("");
    setDraftAuthorCity(memory?.author_city ?? "");
    setDraftAuthorName(memory?.author_name ?? "");
    setDraftCaption(memory?.caption ?? "");
    setDraftMemoryText(memory?.memory_text ?? "");
    setHasClaimSubmitted(false);
    setHasEditSubmitted(false);
    setIsClaimVerified(false);
    setIsOwnerSaving(false);
    setIsOwnerToolsOpen(false);
    setOperationError(null);
    setOwnerSuccessMessage(null);
  }, [itemKey, memory?.author_city, memory?.author_name, memory?.caption, memory?.memory_text]);

  function handleToggleOwnerTools() {
    setIsOwnerToolsOpen((current) => !current);
    setHasClaimSubmitted(false);
    setHasEditSubmitted(false);
    setOperationError(null);
    setOwnerSuccessMessage(null);
  }

  async function handleVerifyClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasClaimSubmitted(true);
    const claimErrors = validateClaimToken(claimToken);
    if (!memory || hasMemoryFieldErrors(claimErrors)) {
      return;
    }

    setIsOwnerSaving(true);
    setOperationError(null);
    setOwnerSuccessMessage(null);
    try {
      await verifyMemoryClaim(placeId, memory.id, claimToken.trim());
      setIsClaimVerified(true);
      setHasClaimSubmitted(false);
    } catch (reason) {
      setIsClaimVerified(false);
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się odblokować edycji. Sprawdź token pamiątki i spróbuj ponownie.",
        title: "Nie udało się odblokować pamiątki",
      });
    } finally {
      setIsOwnerSaving(false);
    }
  }

  async function handleUpdateMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasEditSubmitted(true);
    const normalizedCaption = draftCaption.trim();
    const normalizedMemoryText = draftMemoryText.trim();
    const editErrors = validateMemoryEditForm({
      authorCity: draftAuthorCity,
      authorName: draftAuthorName,
      caption: draftCaption,
      memoryText: draftMemoryText,
    });

    if (!memory || hasMemoryFieldErrors(editErrors)) {
      return;
    }

    setIsOwnerSaving(true);
    setOperationError(null);
    setOwnerSuccessMessage(null);
    try {
      await updateMemory(placeId, memory.id, {
        author_city: draftAuthorCity.trim() || null,
        author_name: draftAuthorName.trim() || null,
        caption: normalizedCaption,
        claim_token: claimToken.trim(),
        memory_text: normalizedMemoryText,
      });
      await queryClient.invalidateQueries({ queryKey: ["places-map"] });
      await queryClient.invalidateQueries({ queryKey: ["place-memories", placeId] });
      setHasEditSubmitted(false);
      setOwnerSuccessMessage("Zapisano zmiany.");
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać zmian w pamiątce. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać pamiątki",
      });
    } finally {
      setIsOwnerSaving(false);
    }
  }

  async function handleDeleteMemory() {
    if (!memory) {
      return;
    }

    setIsOwnerSaving(true);
    setOperationError(null);
    setOwnerSuccessMessage(null);
    try {
      await deleteMemory(placeId, memory.id, claimToken.trim());
      await queryClient.invalidateQueries({ queryKey: ["places-map"] });
      await queryClient.invalidateQueries({ queryKey: ["place-memories", placeId] });
      onDeleted();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się trwale usunąć pamiątki. Spróbuj ponownie.",
        title: "Nie udało się usunąć pamiątki",
      });
      setIsOwnerSaving(false);
    }
  }

  return {
    claimFieldErrors: hasClaimSubmitted ? validateClaimToken(claimToken) : {},
    claimToken,
    draftAuthorCity,
    draftAuthorName,
    draftCaption,
    draftMemoryText,
    editFieldErrors: hasEditSubmitted
      ? validateMemoryEditForm({
          authorCity: draftAuthorCity,
          authorName: draftAuthorName,
          caption: draftCaption,
          memoryText: draftMemoryText,
        })
      : {},
    handleDeleteMemory,
    handleToggleOwnerTools,
    handleUpdateMemory,
    handleVerifyClaim,
    isClaimVerified,
    isOwnerSaving,
    isOwnerToolsOpen,
    operationError,
    ownerSuccessMessage,
    setClaimToken,
    setDraftAuthorCity,
    setDraftAuthorName,
    setDraftCaption,
    setDraftMemoryText,
    setOperationError,
  };
}
