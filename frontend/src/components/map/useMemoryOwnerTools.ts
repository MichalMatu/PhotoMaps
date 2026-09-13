import { FormEvent, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { deleteMemory, updateMemory, verifyMemoryClaim } from "../../api/media";
import type { Memory } from "../../api/types";
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
  const activeItemKeyRef = useRef(itemKey);
  const isMountedRef = useRef(false);
  activeItemKeyRef.current = itemKey;
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
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  function isCurrentOwnerItem(operationItemKey: string) {
    return isMountedRef.current && activeItemKeyRef.current === operationItemKey;
  }

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

    const operationItemKey = itemKey;
    setIsOwnerSaving(true);
    setOperationError(null);
    setOwnerSuccessMessage(null);
    try {
      await verifyMemoryClaim(placeId, memory.id, claimToken.trim());
      if (!isCurrentOwnerItem(operationItemKey)) {
        return;
      }
      setIsClaimVerified(true);
      setHasClaimSubmitted(false);
    } catch (reason) {
      if (!isCurrentOwnerItem(operationItemKey)) {
        return;
      }
      setIsClaimVerified(false);
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się odblokować edycji. Sprawdź token pamiątki i spróbuj ponownie.",
        title: "Nie udało się odblokować pamiątki",
      });
    } finally {
      if (isCurrentOwnerItem(operationItemKey)) {
        setIsOwnerSaving(false);
      }
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

    const operationItemKey = itemKey;
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
      if (!isCurrentOwnerItem(operationItemKey)) {
        return;
      }
      setHasEditSubmitted(false);
      setOwnerSuccessMessage("Zapisano zmiany.");
    } catch (reason) {
      if (!isCurrentOwnerItem(operationItemKey)) {
        return;
      }
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać zmian w pamiątce. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać pamiątki",
      });
    } finally {
      if (isCurrentOwnerItem(operationItemKey)) {
        setIsOwnerSaving(false);
      }
    }
  }

  async function handleDeleteMemory() {
    if (!memory) {
      return;
    }

    const operationItemKey = itemKey;
    setIsOwnerSaving(true);
    setOperationError(null);
    setOwnerSuccessMessage(null);
    try {
      await deleteMemory(placeId, memory.id, claimToken.trim());
      await queryClient.invalidateQueries({ queryKey: ["places-map"] });
      await queryClient.invalidateQueries({ queryKey: ["place-memories", placeId] });
      if (!isCurrentOwnerItem(operationItemKey)) {
        return;
      }
      setIsOwnerSaving(false);
      onDeleted();
    } catch (reason) {
      if (!isCurrentOwnerItem(operationItemKey)) {
        return;
      }
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
