import { FormEvent } from "react";

import { AUDIO_FILE_ACCEPT } from "../ui/audioAttachment";
import { FileInputControl } from "../ui/FileInputControl";
import {
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
  type MemoryFieldErrors,
} from "./memoryValidation";

type Props = {
  audioFile: File | null;
  authorCity: string;
  authorName: string;
  caption: string;
  fieldErrors: MemoryFieldErrors;
  file: File | null;
  fileInputKey: number;
  hasConsent: boolean;
  isSaving: boolean;
  isSubmitDisabled: boolean;
  memoryText: string;
  onAudioFileChange: (file: File | null) => void;
  onAuthorCityChange: (authorCity: string) => void;
  onAuthorNameChange: (authorName: string) => void;
  onCaptionChange: (caption: string) => void;
  onConsentChange: (hasConsent: boolean) => void;
  onFileChange: (file: File | null) => void;
  onMemoryTextChange: (memoryText: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const CONSENT_TEXT =
  "Potwierdzam, że jestem autorem zdjęcia albo mam prawo je opublikować. Jeśli na zdjęciu są rozpoznawalne osoby jako główny temat, mam ich zgodę.";

export function MemoryUploadForm({
  audioFile,
  authorCity,
  authorName,
  caption,
  fieldErrors,
  file,
  fileInputKey,
  hasConsent,
  isSaving,
  isSubmitDisabled,
  memoryText,
  onAudioFileChange,
  onAuthorCityChange,
  onAuthorNameChange,
  onCaptionChange,
  onConsentChange,
  onFileChange,
  onMemoryTextChange,
  onSubmit,
}: Props) {
  return (
    <form className="ui-form photo-upload" noValidate onSubmit={onSubmit}>
      <label>
        Zdjęcie pamiątki
        <FileInputControl
          accept="image/*"
          describedBy={fieldErrors.file ? "memory-file-error" : undefined}
          file={file}
          inputKey={`image-${fileInputKey}`}
          isInvalid={Boolean(fieldErrors.file)}
          onChange={onFileChange}
        />
        {fieldErrors.file ? (
          <span className="field-error" id="memory-file-error">
            {fieldErrors.file}
          </span>
        ) : null}
      </label>
      <label>
        Audio
        <FileInputControl
          accept={AUDIO_FILE_ACCEPT}
          describedBy={fieldErrors.audioFile ? "memory-audio-file-error" : undefined}
          file={audioFile}
          inputKey={`audio-${fileInputKey}`}
          isInvalid={Boolean(fieldErrors.audioFile)}
          onChange={onAudioFileChange}
        />
        {fieldErrors.audioFile ? (
          <span className="field-error" id="memory-audio-file-error">
            {fieldErrors.audioFile}
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
          onChange={(event) => onCaptionChange(event.target.value)}
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
          onChange={(event) => onMemoryTextChange(event.target.value)}
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
            onChange={(event) => onAuthorNameChange(event.target.value)}
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
            onChange={(event) => onAuthorCityChange(event.target.value)}
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
          onChange={(event) => onConsentChange(event.target.checked)}
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
  );
}
