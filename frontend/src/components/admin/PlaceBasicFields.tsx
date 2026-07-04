import type { AppConfigMap, City, PlaceStatus } from "../../api/types";
import { MAX_PLACE_PRIORITY, MIN_PLACE_PRIORITY, PLACE_PRIORITY_STEP } from "../../config/placePriority";
import { LocationPicker } from "./LocationPicker";
import { ADMIN_PLACE_STATUS_OPTIONS } from "./adminStatusUi";

type Props = {
  availableCities: City[];
  cityId: string;
  description: string;
  localComment: string;
  location: AppConfigMap["fallback_center"];
  selectedCityName: string;
  status: PlaceStatus;
  title: string;
  weight: string;
  onCityChange: (cityId: string) => void;
  onDescriptionChange: (description: string) => void;
  onLocalCommentChange: (localComment: string) => void;
  onLocationChange: (location: AppConfigMap["fallback_center"]) => void;
  onStatusChange: (status: PlaceStatus) => void;
  onTitleChange: (title: string) => void;
  onWeightChange: (weight: string) => void;
};

export function PlaceBasicFields({
  availableCities,
  cityId,
  description,
  localComment,
  location,
  onCityChange,
  onDescriptionChange,
  onLocalCommentChange,
  onLocationChange,
  onStatusChange,
  onTitleChange,
  onWeightChange,
  selectedCityName,
  status,
  title,
  weight,
}: Props) {
  return (
    <>
      <label>
        Nazwa
        <input value={title} onChange={(event) => onTitleChange(event.target.value)} required />
      </label>

      <label>
        Miasto
        <select value={cityId} onChange={(event) => onCityChange(event.target.value)} required>
          {availableCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </label>

      <div className="location-field">
        <span>Lokalizacja</span>
        <LocationPicker
          mode="modal-only"
          previewLabel={selectedCityName}
          position={location}
          onChange={onLocationChange}
        />
      </div>

      <label>
        Opis
        <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={4} />
      </label>

      <label>
        Lokalny komentarz
        <textarea value={localComment} onChange={(event) => onLocalCommentChange(event.target.value)} rows={3} />
      </label>

      <div className="field-row">
        <label>
          Priorytet redakcji
          <input
            type="number"
            min={MIN_PLACE_PRIORITY}
            max={MAX_PLACE_PRIORITY}
            step={PLACE_PRIORITY_STEP}
            value={weight}
            onChange={(event) => onWeightChange(event.target.value)}
            required
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => onStatusChange(event.target.value as PlaceStatus)}>
            {ADMIN_PLACE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
