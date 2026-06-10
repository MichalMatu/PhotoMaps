import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { deleteMemory, mediaUrl, updateMemory, verifyMemoryClaim, type PlaceMapItem } from "../../api/client";
import type { PlaceMapVisualItem } from "./placePreview";
import { stopFloatingWindowEvent, useDraggableWindow } from "../ui/useDraggableWindow";

type Props = {
  item: PlaceMapVisualItem;
  onClose: () => void;
  onReport: () => void;
  place: PlaceMapItem;
};

const CLAIM_TOKEN_MIN_LENGTH = 8;
const CLAIM_TOKEN_MAX_LENGTH = 64;
const MEMORY_AUTHOR_MAX_LENGTH = 40;
const MEMORY_CAPTION_MAX_LENGTH = 80;
const MEMORY_TEXT_MAX_LENGTH = 240;

export function PhotoDetailModal({ item, onClose, onReport, place }: Props) {
  const queryClient = useQueryClient();
  const draggableWindow = useDraggableWindow<HTMLDivElement>("photo-detail-modal");
  const memorySource = item.kind === "memory" ? item.source : null;
  const [claimToken, setClaimToken] = useState("");
  const [draftAuthorCity, setDraftAuthorCity] = useState("");
  const [draftAuthorName, setDraftAuthorName] = useState("");
  const [draftCaption, setDraftCaption] = useState("");
  const [draftMemoryText, setDraftMemoryText] = useState("");
  const [isClaimVerified, setIsClaimVerified] = useState(false);
  const [isOwnerSaving, setIsOwnerSaving] = useState(false);
  const [isOwnerToolsOpen, setIsOwnerToolsOpen] = useState(false);
  const [ownerMessage, setOwnerMessage] = useState<string | null>(null);
  const isClaimTokenReady = claimToken.trim().length >= CLAIM_TOKEN_MIN_LENGTH;

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
    setIsClaimVerified(false);
    setIsOwnerSaving(false);
    setIsOwnerToolsOpen(false);
    setOwnerMessage(null);
  }, [item.id, item.kind, memorySource?.author_city, memorySource?.author_name, memorySource?.caption, memorySource?.memory_text]);

  async function handleVerifyClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memorySource || !isClaimTokenReady) {
      return;
    }

    setIsOwnerSaving(true);
    setOwnerMessage(null);
    try {
      await verifyMemoryClaim(place.id, memorySource.id, claimToken.trim());
      setIsClaimVerified(true);
    } catch (reason) {
      setIsClaimVerified(false);
      setOwnerMessage(reason instanceof Error ? reason.message : "Token pamiątki jest nieprawidłowy.");
    } finally {
      setIsOwnerSaving(false);
    }
  }

  async function handleUpdateMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCaption = draftCaption.trim();
    const normalizedMemoryText = draftMemoryText.trim();
    const isAuthorNameValid = draftAuthorName.trim().length <= MEMORY_AUTHOR_MAX_LENGTH;
    const isAuthorCityValid = draftAuthorCity.trim().length <= MEMORY_AUTHOR_MAX_LENGTH;

    if (
      !memorySource ||
      !isClaimTokenReady ||
      !normalizedCaption ||
      normalizedCaption.length > MEMORY_CAPTION_MAX_LENGTH ||
      !normalizedMemoryText ||
      normalizedMemoryText.length > MEMORY_TEXT_MAX_LENGTH ||
      !isAuthorNameValid ||
      !isAuthorCityValid
    ) {
      return;
    }

    setIsOwnerSaving(true);
    setOwnerMessage(null);
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
      setOwnerMessage("Zapisano zmiany.");
    } catch (reason) {
      setOwnerMessage(reason instanceof Error ? reason.message : "Nie udało się zapisać zmian.");
    } finally {
      setIsOwnerSaving(false);
    }
  }

  async function handleDeleteMemory() {
    if (!memorySource || !isClaimTokenReady) {
      return;
    }

    setIsOwnerSaving(true);
    setOwnerMessage(null);
    try {
      await deleteMemory(place.id, memorySource.id, claimToken.trim());
      await queryClient.invalidateQueries({ queryKey: ["places-map"] });
      await queryClient.invalidateQueries({ queryKey: ["place-memories", place.id] });
      onClose();
    } catch (reason) {
      setOwnerMessage(reason instanceof Error ? reason.message : "Nie udało się usunąć pamiątki.");
      setIsOwnerSaving(false);
    }
  }

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
                  setOwnerMessage(null);
                }}
              >
                Edytuj moją pamiątkę
              </button>
              {isOwnerToolsOpen ? (
                <>
                  {!isClaimVerified ? (
                    <form className="memory-owner-form" onSubmit={handleVerifyClaim}>
                      <label>
                        Token pamiątki
                        <input
                          autoComplete="off"
                          maxLength={CLAIM_TOKEN_MAX_LENGTH}
                          minLength={CLAIM_TOKEN_MIN_LENGTH}
                          value={claimToken}
                          onChange={(event) => setClaimToken(event.target.value)}
                        />
                      </label>
                      <button type="submit" disabled={!isClaimTokenReady || isOwnerSaving}>
                        {isOwnerSaving ? "Sprawdzanie..." : "Odblokuj"}
                      </button>
                    </form>
                  ) : (
                    <form className="memory-owner-form" onSubmit={handleUpdateMemory}>
                      <label>
                        Podpis
                        <input
                          maxLength={MEMORY_CAPTION_MAX_LENGTH}
                          value={draftCaption}
                          onChange={(event) => setDraftCaption(event.target.value)}
                          required
                        />
                      </label>
                      <label>
                        Myśl / wspomnienie
                        <textarea
                          maxLength={MEMORY_TEXT_MAX_LENGTH}
                          rows={3}
                          value={draftMemoryText}
                          onChange={(event) => setDraftMemoryText(event.target.value)}
                          required
                        />
                      </label>
                      <div className="memory-owner-field-row">
                        <label>
                          Imię
                          <input
                            maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                            value={draftAuthorName}
                            onChange={(event) => setDraftAuthorName(event.target.value)}
                          />
                        </label>
                        <label>
                          Miasto
                          <input
                            maxLength={MEMORY_AUTHOR_MAX_LENGTH}
                            value={draftAuthorCity}
                            onChange={(event) => setDraftAuthorCity(event.target.value)}
                          />
                        </label>
                      </div>
                      <div className="memory-owner-actions">
                        <button type="submit" disabled={!draftCaption.trim() || !draftMemoryText.trim() || isOwnerSaving}>
                          {isOwnerSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                        </button>
                        <button className="danger-button" type="button" disabled={isOwnerSaving} onClick={handleDeleteMemory}>
                          Usuń trwale
                        </button>
                      </div>
                    </form>
                  )}
                  {ownerMessage ? <p className="memory-owner-message">{ownerMessage}</p> : null}
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
      </article>
    </div>,
    document.body,
  );
}
