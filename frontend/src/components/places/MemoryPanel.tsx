import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getPlaceMemories, mediaUrl, uploadPlaceMemory } from "../../api/client";
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";
import { MediaImage } from "../ui/MediaImage";
import { getMemoryPanelVisibility, type MemoryPanelMode } from "./memoryPanelMode";
import {
  CLAIM_TOKEN_MIN_LENGTH,
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
  hasMemoryFieldErrors,
  validateMemoryUploadForm,
} from "./memoryValidation";

type Props = {
  claimToken: string;
  mode?: MemoryPanelMode;
  onUploaded?: () => void;
  placeId: string;
};

const CONSENT_TEXT =
  "Potwierdzam, że jestem autorem zdjęcia albo mam prawo je opublikować. Jeśli na zdjęciu są rozpoznawalne osoby jako główny temat, mam ich zgodę.";

export function MemoryPanel({ claimToken, mode = "with-list", onUploaded, placeId }: Props) {
  const queryClient = useQueryClient();
  const visibility = getMemoryPanelVisibility(mode);
  const [authorCity, setAuthorCity] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [memoryText, setMemoryText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const memoriesQuery = useQuery({
    enabled: visibility.loadExistingMemories,
    queryKey: ["place-memories", placeId],
    queryFn: () => getPlaceMemories(placeId),
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    const nextFieldErrors = validateMemoryUploadForm({
      authorCity,
      authorName,
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
        caption,
        claimToken,
        consentConfirmed: hasConsent,
        file,
        memoryText,
      });
      setAuthorCity("");
      setAuthorName("");
      setCaption("");
      setFile(null);
      setHasConsent(false);
      setHasSubmitted(false);
      setMemoryText("");
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
        caption,
        file,
        hasConsent,
        memoryText,
      })
    : {};
  const isSubmitDisabled = isSaving || !hasConsent;

  return (
    <section className="memory-panel">
      {visibility.showHeading ? (
        <div className="section-heading compact-heading">
          <h3>Byłem tutaj</h3>
          <span>{memoriesQuery.data?.length ?? 0}</span>
        </div>
      ) : null}
      {visibility.showExistingMemories && memoriesQuery.isLoading ? (
        <p className="inline-status">Ładowanie pamiątek...</p>
      ) : null}
      {visibility.showExistingMemories ? (
        <div className="memory-list">
          {memoriesQuery.data?.map((memory) => (
            <article className="memory-card" key={memory.id}>
              <MediaImage
                alt={memory.caption}
                className="memory-card-media"
                ratio="square"
                src={mediaUrl(memory.thumb_path)}
              />
              <div>
                <strong>{memory.author_name ?? "Gość"}</strong>
                {memory.author_city ? <span>{memory.author_city}</span> : null}
                <p>{memory.caption}</p>
                <p className="memory-card-note">{memory.memory_text}</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <form className="photo-upload" noValidate onSubmit={handleSubmit}>
        <label>
          Zdjęcie pamiątki
          <input
            accept="image/*"
            aria-describedby={fieldErrors.file ? "memory-file-error" : undefined}
            aria-invalid={Boolean(fieldErrors.file)}
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          {fieldErrors.file ? (
            <span className="field-error" id="memory-file-error">
              {fieldErrors.file}
            </span>
          ) : null}
        </label>
        <label>
          Podpis
          <input
            aria-describedby={fieldErrors.caption ? "memory-caption-error" : undefined}
            aria-invalid={Boolean(fieldErrors.caption)}
            maxLength={MEMORY_CAPTION_MAX_LENGTH}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            required
          />
          {fieldErrors.caption ? (
            <span className="field-error" id="memory-caption-error">
              {fieldErrors.caption}
            </span>
          ) : null}
        </label>
        <label>
          Myśl / wspomnienie
          <textarea
            aria-describedby={fieldErrors.memoryText ? "memory-text-error" : undefined}
            aria-invalid={Boolean(fieldErrors.memoryText)}
            maxLength={MEMORY_TEXT_MAX_LENGTH}
            rows={3}
            value={memoryText}
            onChange={(event) => setMemoryText(event.target.value)}
            required
          />
          <span className="field-limit">
            {memoryText.trim().length}/{MEMORY_TEXT_MAX_LENGTH}
          </span>
          {fieldErrors.memoryText ? (
            <span className="field-error" id="memory-text-error">
              {fieldErrors.memoryText}
            </span>
          ) : null}
        </label>
        <div className="field-row">
          <label>
            Imię
            <input
              aria-describedby={fieldErrors.authorName ? "memory-author-name-error" : undefined}
              aria-invalid={Boolean(fieldErrors.authorName)}
              maxLength={MEMORY_AUTHOR_MAX_LENGTH}
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
            />
            {fieldErrors.authorName ? (
              <span className="field-error" id="memory-author-name-error">
                {fieldErrors.authorName}
              </span>
            ) : null}
          </label>
          <label>
            Miasto
            <input
              aria-describedby={fieldErrors.authorCity ? "memory-author-city-error" : undefined}
              aria-invalid={Boolean(fieldErrors.authorCity)}
              maxLength={MEMORY_AUTHOR_MAX_LENGTH}
              value={authorCity}
              onChange={(event) => setAuthorCity(event.target.value)}
            />
            {fieldErrors.authorCity ? (
              <span className="field-error" id="memory-author-city-error">
                {fieldErrors.authorCity}
              </span>
            ) : null}
          </label>
        </div>
        <label className="checkbox-field consent-field">
          <input
            aria-describedby={fieldErrors.hasConsent ? "memory-consent-error" : undefined}
            aria-invalid={Boolean(fieldErrors.hasConsent)}
            checked={hasConsent}
            type="checkbox"
            onChange={(event) => setHasConsent(event.target.checked)}
          />
          <span>{CONSENT_TEXT}</span>
          {fieldErrors.hasConsent ? (
            <span className="field-error" id="memory-consent-error">
              {fieldErrors.hasConsent}
            </span>
          ) : null}
        </label>
        <button type="submit" disabled={isSubmitDisabled}>
          {isSaving ? "Wysyłanie..." : "Dodaj pamiątkę"}
        </button>
      </form>
      {operationError ? <ErrorModal {...operationError} onClose={() => setOperationError(null)} /> : null}
    </section>
  );
}
