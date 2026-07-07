import { FormEvent } from "react";

import { AUDIO_FILE_ACCEPT } from "../ui/audioAttachment";
import { FileInputControl } from "../ui/FileInputControl";
import { SettingField } from "../ui/SettingField";
import {
  MEMORY_AUTHOR_MAX_LENGTH,
  MEMORY_CAPTION_MAX_LENGTH,
  MEMORY_TEXT_MAX_LENGTH,
  type MemoryFieldErrors,
} from "./memoryValidation";
import { PUBLIC_PLACE_INTERACTION_HELP } from "./publicPlaceInteractionHelp";

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
      <SettingField
        id="memory-photo-file"
        label="Zdjęcie pamiątki"
        hint={PUBLIC_PLACE_INTERACTION_HELP["memory-photo"]}
        helpMode="inline"
        describedByProp="describedBy"
        footer={
          fieldErrors.file ? (
            <span className="field-error" id="memory-file-error">
              {fieldErrors.file}
            </span>
          ) : null
        }
      >
        <FileInputControl
          accept="image/*"
          describedBy={fieldErrors.file ? "memory-file-error" : undefined}
          file={file}
          inputKey={`image-${fileInputKey}`}
          isInvalid={Boolean(fieldErrors.file)}
          onChange={onFileChange}
        />
      </SettingField>
      <SettingField
        id="memory-audio-file"
        label="Audio"
        hint={PUBLIC_PLACE_INTERACTION_HELP["memory-audio"]}
        helpMode="inline"
        describedByProp="describedBy"
        footer={
          fieldErrors.audioFile ? (
            <span className="field-error" id="memory-audio-file-error">
              {fieldErrors.audioFile}
            </span>
          ) : null
        }
      >
        <FileInputControl
          accept={AUDIO_FILE_ACCEPT}
          describedBy={fieldErrors.audioFile ? "memory-audio-file-error" : undefined}
          file={audioFile}
          inputKey={`audio-${fileInputKey}`}
          isInvalid={Boolean(fieldErrors.audioFile)}
          onChange={onAudioFileChange}
        />
      </SettingField>
      <SettingField
        id="memory-caption"
        label="Podpis"
        hint={PUBLIC_PLACE_INTERACTION_HELP["memory-caption"]}
        helpMode="inline"
        footer={
          fieldErrors.caption ? (
            <span className="field-error" id="memory-caption-error">
              {fieldErrors.caption}
            </span>
          ) : null
        }
      >
        <input
          aria-describedby={fieldErrors.caption ? "memory-caption-error" : undefined}
          aria-invalid={Boolean(fieldErrors.caption)}
          maxLength={MEMORY_CAPTION_MAX_LENGTH}
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          required
        />
      </SettingField>
      <SettingField
        id="memory-text"
        label="Myśl / wspomnienie"
        hint={PUBLIC_PLACE_INTERACTION_HELP["memory-text"]}
        helpMode="inline"
        footer={
          <>
            <span className="field-limit">
              {memoryText.trim().length}/{MEMORY_TEXT_MAX_LENGTH}
            </span>
            {fieldErrors.memoryText ? (
              <span className="field-error" id="memory-text-error">
                {fieldErrors.memoryText}
              </span>
            ) : null}
          </>
        }
      >
        <textarea
          aria-describedby={fieldErrors.memoryText ? "memory-text-error" : undefined}
          aria-invalid={Boolean(fieldErrors.memoryText)}
          maxLength={MEMORY_TEXT_MAX_LENGTH}
          rows={3}
          value={memoryText}
          onChange={(event) => onMemoryTextChange(event.target.value)}
          required
        />
      </SettingField>
      <div className="field-row">
        <SettingField
          id="memory-author-name"
          label="Imię"
          hint={PUBLIC_PLACE_INTERACTION_HELP["memory-author-name"]}
          helpMode="inline"
          footer={
            fieldErrors.authorName ? (
              <span className="field-error" id="memory-author-name-error">
                {fieldErrors.authorName}
              </span>
            ) : null
          }
        >
          <input
            aria-describedby={fieldErrors.authorName ? "memory-author-name-error" : undefined}
            aria-invalid={Boolean(fieldErrors.authorName)}
            maxLength={MEMORY_AUTHOR_MAX_LENGTH}
            value={authorName}
            onChange={(event) => onAuthorNameChange(event.target.value)}
          />
        </SettingField>
        <SettingField
          id="memory-author-city"
          label="Miasto"
          hint={PUBLIC_PLACE_INTERACTION_HELP["memory-author-city"]}
          helpMode="inline"
          footer={
            fieldErrors.authorCity ? (
              <span className="field-error" id="memory-author-city-error">
                {fieldErrors.authorCity}
              </span>
            ) : null
          }
        >
          <input
            aria-describedby={fieldErrors.authorCity ? "memory-author-city-error" : undefined}
            aria-invalid={Boolean(fieldErrors.authorCity)}
            maxLength={MEMORY_AUTHOR_MAX_LENGTH}
            value={authorCity}
            onChange={(event) => onAuthorCityChange(event.target.value)}
          />
        </SettingField>
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
