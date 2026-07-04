import type { FormEvent } from "react";

import type { City, ContentBlock, ContentBlockType, Place } from "../../api/types";
import { ContentBlockEditor } from "../content/ContentBlockEditor";
import { AUDIO_FILE_ACCEPT } from "../ui/audioAttachment";
import { FileInputControl } from "../ui/FileInputControl";
import { SystemModal } from "./SystemModal";
import { PHOTO_CAPTION_MAX_LENGTH } from "./adminMediaUi";
import { PhotoAttributionFields } from "./PhotoAttributionFields";
import type { PhotoAttributionDraft } from "./placePhotoPanelState";

type Props = {
  audioFile: File | null;
  audioError: string | null;
  attributionDraft: PhotoAttributionDraft;
  caption: string;
  canSubmit: boolean;
  cities: City[];
  cityId: string;
  descriptionBlocks: ContentBlock[];
  file: File | null;
  inputKey: number;
  isUploading: boolean;
  onCaptionChange: (value: string) => void;
  onCityChange: (cityId: string) => void;
  onAddDescriptionBlock: (type: ContentBlockType) => void;
  onAttributionDraftChange: (draft: PhotoAttributionDraft) => void;
  onRemoveDescriptionBlock: (index: number) => void;
  onUpdateDescriptionBlock: (index: number, block: ContentBlock) => void;
  onUpdateDescriptionBlockType: (index: number, type: ContentBlockType) => void;
  onClose: () => void;
  onConfirm: () => void;
  onFileChange: (file: File | null) => void;
  onAudioFileChange: (file: File | null) => void;
  onPlaceChange: (placeId: string) => void;
  lockedPlace?: Place | null;
  places: Place[];
  placeId: string;
};

export function PhotoUploadModal({
  audioFile,
  audioError,
  attributionDraft,
  caption,
  canSubmit,
  cities,
  cityId,
  descriptionBlocks,
  file,
  inputKey,
  isUploading,
  onAudioFileChange,
  onAddDescriptionBlock,
  onAttributionDraftChange,
  onCaptionChange,
  onCityChange,
  onClose,
  onConfirm,
  onFileChange,
  onRemoveDescriptionBlock,
  onPlaceChange,
  onUpdateDescriptionBlock,
  onUpdateDescriptionBlockType,
  lockedPlace = null,
  places,
  placeId,
}: Props) {
  const cityPlaces = places.filter((place) => place.city_id === cityId);
  const lockedCityName = lockedPlace
    ? (cities.find((city) => city.id === lockedPlace.city_id)?.name ?? lockedPlace.city_id)
    : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isUploading) {
      return;
    }

    onConfirm();
  }

  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmDisabled={!canSubmit}
      confirmFormId="photo-upload-form-modal"
      confirmLabel="Dodaj zdjęcie"
      eyebrow="Zdjęcia"
      isBusy={isUploading}
      size="wide"
      title="Dodaj zdjęcie"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <form
        id="photo-upload-form-modal"
        className="ui-form admin-photo-upload admin-photo-upload--modal"
        onSubmit={handleSubmit}
      >
        {lockedPlace ? (
          <div className="admin-photo-upload-context" aria-label="Kontekst dodawanego zdjęcia">
            <span>
              <strong>Miasto</strong>
              {lockedCityName}
            </span>
            <span>
              <strong>Miejsce</strong>
              {lockedPlace.title}
            </span>
          </div>
        ) : (
          <>
            <label>
              Miasto
              <select value={cityId} onChange={(event) => onCityChange(event.target.value)} required>
                <option value="">Wybierz miasto</option>
                {cities.map((city) => (
                  <option value={city.id} key={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Miejsce
              <select
                value={placeId}
                disabled={!cityId}
                onChange={(event) => onPlaceChange(event.target.value)}
                required
              >
                <option value="">Wybierz miejsce</option>
                {cityPlaces.map((place) => (
                  <option value={place.id} key={place.id}>
                    {place.title}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          Zdjęcie
          <FileInputControl accept="image/*" file={file} inputKey={`image-${inputKey}`} onChange={onFileChange} />
        </label>
        <label>
          Audio
          <FileInputControl
            accept={AUDIO_FILE_ACCEPT}
            describedBy={audioError ? "admin-photo-audio-error" : undefined}
            file={audioFile}
            inputKey={`audio-${inputKey}`}
            isInvalid={Boolean(audioError)}
            onChange={onAudioFileChange}
          />
          {audioError ? (
            <span className="field-error" id="admin-photo-audio-error">
              {audioError}
            </span>
          ) : null}
        </label>
        <label>
          Podpis
          <input
            maxLength={PHOTO_CAPTION_MAX_LENGTH}
            value={caption}
            onChange={(event) => onCaptionChange(event.target.value)}
          />
        </label>
        <ContentBlockEditor
          blocks={descriptionBlocks}
          legend="Opis zdjęcia"
          onAddBlock={onAddDescriptionBlock}
          onRemoveBlock={onRemoveDescriptionBlock}
          onUpdateBlock={onUpdateDescriptionBlock}
          onUpdateBlockType={onUpdateDescriptionBlockType}
        />
        <PhotoAttributionFields draft={attributionDraft} onChange={onAttributionDraftChange} />
      </form>
    </SystemModal>
  );
}
