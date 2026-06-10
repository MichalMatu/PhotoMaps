import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { deleteMemory, mediaUrl, updateMemory, verifyMemoryClaim, type PlaceMapItem } from "../../api/client";
import {
  CLAIM_TOKEN_MAX_LENGTH,
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
  hasMemoryFieldErrors,
  validateClaimToken,
  validateMemoryEditForm,
} from "../places/memoryValidation";
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";
import type { PlaceMapVisualItem } from "./placePreview";
import { stopFloatingWindowEvent, useDraggableWindow } from "../ui/useDraggableWindow";

type Props = {
  item: PlaceMapVisualItem;
  onClose: () => void;
  onReport: () => void;
  place: PlaceMapItem;
};

export function PhotoDetailModal({ item, onClose, onReport, place }: Props) {
  const queryClient = useQueryClient();
  const draggableWindow = useDraggableWindow<HTMLDivElement>("photo-detail-modal");
  const memorySource = item.kind === "memory" ? item.source : null;
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    setClaimToken("");
    setDraftAuthorCity(memorySource?.author_city ?? "");
    setDraftAuthorName(memorySource?.author_name ?? "");
    setDraftCaption(memorySource?.caption ?? "");
    setDraftMemoryText(memorySource?.memory_text ?? "");
    setHasClaimSubmitted(false);
    setHasEditSubmitted(false);
    setIsClaimVerified(false);
    setIsOwnerSaving(false);
    setIsOwnerToolsOpen(false);
    setOperationError(null);
    setOwnerSuccessMessage(null);
  }, [item.id, item.kind, memorySource?.author_city, memorySource?.author_name, memorySource?.caption, memorySource?.memory_text]);

  async function handleVerifyClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasClaimSubmitted(true);
    const claimErrors = validateClaimToken(claimToken);
    if (!memorySource || hasMemoryFieldErrors(claimErrors)) {
      return;
    }

    setIsOwnerSaving(true);
    setOperationError(null);
    setOwnerSuccessMessage(null);
    try {
      await verifyMemoryClaim(place.id, memorySource.id, claimToken.trim());
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

    if (!memorySource || hasMemoryFieldErrors(editErrors)) {
      return;
    }

    setIsOwnerSaving(true);
    setOperationError(null);
    setOwnerSuccessMessage(null);
    try {
      await updateMemory(place.id, memorySource.id, {
        author_city: draftAuthorCity.trim() || null,
        author_name: draftAuthorName.trim() || null,
        caption: normalizedCaption,
        claim_token: claimToken.trim(),
        memory_text: normalizedMemoryText,
      });
      await queryClient.invalidateQueries({ queryKey: ["places-map"] });
      await queryClient.invalidateQueries({ queryKey: ["place-memories", place.id] });
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
    if (!memorySource) {
      return;
    }

    setIsOwnerSaving(true);
    setOperationError(null);
    setOwnerSuccessMessage(null);
    try {
      await deleteMemory(place.id, memorySource.id, claimToken.trim());
      await queryClient.invalidateQueries({ queryKey: ["places-map"] });
      await queryClient.invalidateQueries({ queryKey: ["place-memories", place.id] });
      onClose();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się trwale usunąć pamiątki. Spróbuj ponownie.",
        title: "Nie udało się usunąć pamiątki",
      });
      setIsOwnerSaving(false);
    }
  }

  const claimFieldErrors = hasClaimSubmitted ? validateClaimToken(claimToken) : {};
  const editFieldErrors = hasEditSubmitted
    ? validateMemoryEditForm({
        authorCity: draftAuthorCity,
        authorName: draftAuthorName,
        caption: draftCaption,
        memoryText: draftMemoryText,
      })
    : {};

  return createPortal(
    <div className="photo-detail-backdrop" role="presentation" onClick={onClose}>
      <article
        className={draggableWindow.isDragging ? "photo-detail-modal is-dragging" : "photo-detail-modal"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-detail-title"
        ref={draggableWindow.windowRef}
        style={draggableWindow.style}
        onClick={stopFloatingWindowEvent}
        onContextMenu={stopFloatingWindowEvent}
        onDoubleClick={stopFloatingWindowEvent}
        onMouseDown={stopFloatingWindowEvent}
        onPointerDown={stopFloatingWindowEvent}
        onTouchStart={stopFloatingWindowEvent}
        onWheel={stopFloatingWindowEvent}
      >
        <header className="photo-detail-header" {...draggableWindow.handleProps}>
          <div className="photo-detail-title-block">
            <div className="photo-detail-title-row">
              <h2 id="photo-detail-title">{place.title}</h2>
              {place.category?.label ? <span className="photo-detail-category">{place.category.label}</span> : null}
            </div>
          </div>
          <button
            className="photo-detail-close"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            aria-label="Zamknij"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="photo-detail-image-wrap">
          <img className="photo-detail-image" src={mediaUrl(item.public_path)} alt={item.caption ?? place.title} />
          {item.caption ? <span className="photo-detail-image-caption">{item.caption}</span> : null}
        </div>

        <div className="photo-detail-body">
          {memorySource ? <p className="photo-detail-memory-text">{memorySource.memory_text}</p> : null}
          {memorySource ? (
            <div className="memory-owner-tools">
              <button
                className="memory-owner-link"
                type="button"
                onClick={() => {
                  setIsOwnerToolsOpen((current) => !current);
                  setHasClaimSubmitted(false);
                  setHasEditSubmitted(false);
                  setOperationError(null);
                  setOwnerSuccessMessage(null);
                }}
              >
                Edytuj moją pamiątkę
              </button>
              {isOwnerToolsOpen ? (
                <>
                  {!isClaimVerified ? (
                    <form className="memory-owner-form" noValidate onSubmit={handleVerifyClaim}>
                      <label>
                        Token pamiątki
                        <input
                          autoComplete="off"
                          aria-describedby={claimFieldErrors.claimToken ? "photo-detail-claim-token-error" : undefined}
                          aria-invalid={Boolean(claimFieldErrors.claimToken)}
                          maxLength={CLAIM_TOKEN_MAX_LENGTH}
                          value={claimToken}
                          onChange={(event) => setClaimToken(event.target.value)}
                        />
                        {claimFieldErrors.claimToken ? (
                          <span className="field-error" id="photo-detail-claim-token-error">
                            {claimFieldErrors.claimToken}
                          </span>
                        ) : null}
                      </label>
                      <button type="submit" disabled={isOwnerSaving}>
                        {isOwnerSaving ? "Sprawdzanie..." : "Odblokuj"}
                      </button>
                    </form>
                  ) : (
                    <form className="memory-owner-form" noValidate onSubmit={handleUpdateMemory}>
                      <label>
                        Podpis
                        <input
                          aria-describedby={editFieldErrors.caption ? "photo-detail-caption-error" : undefined}
                          aria-invalid={Boolean(editFieldErrors.caption)}
                          maxLength={MEMORY_CAPTION_MAX_LENGTH}
                          value={draftCaption}
                          onChange={(event) => setDraftCaption(event.target.value)}
                          required
                        />
                        {editFieldErrors.caption ? (
                          <span className="field-error" id="photo-detail-caption-error">
                            {editFieldErrors.caption}
                          </span>
                        ) : null}
                      </label>
                      <label>
                        Myśl / wspomnienie
                        <textarea
                          aria-describedby={editFieldErrors.memoryText ? "photo-detail-memory-text-error" : undefined}
                          aria-invalid={Boolean(editFieldErrors.memoryText)}
                          maxLength={MEMORY_TEXT_MAX_LENGTH}
                          rows={3}
                          value={draftMemoryText}
                          onChange={(event) => setDraftMemoryText(event.target.value)}
                          required
                        />
                        {editFieldErrors.memoryText ? (
                          <span className="field-error" id="photo-detail-memory-text-error">
                            {editFieldErrors.memoryText}
                          </span>
                        ) : null}
                      </label>
                      <div className="memory-owner-field-row">
                        <label>
                          Imię
                          <input
                            aria-describedby={editFieldErrors.authorName ? "photo-detail-author-name-error" : undefined}
                            aria-invalid={Boolean(editFieldErrors.authorName)}
                            maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                            value={draftAuthorName}
                            onChange={(event) => setDraftAuthorName(event.target.value)}
                          />
                          {editFieldErrors.authorName ? (
                            <span className="field-error" id="photo-detail-author-name-error">
                              {editFieldErrors.authorName}
                            </span>
                          ) : null}
                        </label>
                        <label>
                          Miasto
                          <input
                            aria-describedby={editFieldErrors.authorCity ? "photo-detail-author-city-error" : undefined}
                            aria-invalid={Boolean(editFieldErrors.authorCity)}
                            maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                            value={draftAuthorCity}
                            onChange={(event) => setDraftAuthorCity(event.target.value)}
                          />
                          {editFieldErrors.authorCity ? (
                            <span className="field-error" id="photo-detail-author-city-error">
                              {editFieldErrors.authorCity}
                            </span>
                          ) : null}
                        </label>
                      </div>
                      <div className="memory-owner-actions">
                        <button type="submit" disabled={isOwnerSaving}>
                          {isOwnerSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                        </button>
                        <button className="danger-button" type="button" disabled={isOwnerSaving} onClick={handleDeleteMemory}>
                          Usuń trwale
                        </button>
                      </div>
                    </form>
                  )}
                  {ownerSuccessMessage ? <p className="memory-owner-message">{ownerSuccessMessage}</p> : null}
                </>
              ) : null}
            </div>
          ) : null}
          <div className="photo-detail-footer">
            <button className="photo-detail-report-link" type="button" onClick={onReport}>
              Zgłoś problem
            </button>
          </div>
        </div>
        {operationError ? <ErrorModal {...operationError} onClose={() => setOperationError(null)} /> : null}
      </article>
    </div>,
    document.body,
  );
}
