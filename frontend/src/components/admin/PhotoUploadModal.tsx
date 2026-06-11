import type { Place } from "../../api/client";
import { SystemModal } from "./SystemModal";
import { PHOTO_CAPTION_MAX_LENGTH } from "./adminMediaUi";

type Props = {
  caption: string;
  canSubmit: boolean;
  inputKey: number;
  isUploading: boolean;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onFileChange: (file: File | null) => void;
  onPlaceChange: (placeId: string) => void;
  places: Place[];
  placeId: string;
};

export function PhotoUploadModal({
  caption,
  canSubmit,
  inputKey,
  isUploading,
  onCaptionChange,
  onClose,
  onConfirm,
  onFileChange,
  onPlaceChange,
  places,
  placeId,
}: Props) {
  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmDisabled={!canSubmit}
      confirmLabel="Dodaj zdjęcie"
      eyebrow="Zdjęcia"
      isBusy={isUploading}
      title="Dodaj zdjęcie"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="admin-photo-upload admin-photo-upload--modal">
        <label>
          Miejsce
          <select value={placeId} onChange={(event) => onPlaceChange(event.target.value)} required>
            <option value="">Wybierz miejsce</option>
            {places.map((place) => (
              <option value={place.id} key={place.id}>
                {place.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zdjęcie
          <input
            accept="image/*"
            key={inputKey}
            type="file"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          Podpis
          <input
            maxLength={PHOTO_CAPTION_MAX_LENGTH}
            value={caption}
            onChange={(event) => onCaptionChange(event.target.value)}
          />
        </label>
      </div>
    </SystemModal>
  );
}
