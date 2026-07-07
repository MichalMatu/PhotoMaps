import type { AppConfigMap, City, PlaceStatus } from "../../api/types";
import { MAX_PLACE_PRIORITY, MIN_PLACE_PRIORITY, PLACE_PRIORITY_STEP } from "../../config/placePriority";
import { SettingField } from "../ui/SettingField";
import { LocationPicker } from "./LocationPicker";
import { ADMIN_PLACE_FIELD_HELP } from "./adminPlaceFieldHelp";
import { ADMIN_PLACE_STATUS_OPTIONS } from "./adminStatusUi";
import type { PlaceLocationAutoSaveStatus } from "./placeLocationAutoSave";

type Props = {
  availableCities: City[];
  cityId: string;
  description: string;
  localComment: string;
  location: AppConfigMap["fallback_center"];
  locationAutoSaveStatus?: PlaceLocationAutoSaveStatus;
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
  locationAutoSaveStatus,
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
      <SettingField id="place-title" label="Nazwa" hint={ADMIN_PLACE_FIELD_HELP.title}>
        <input value={title} onChange={(event) => onTitleChange(event.target.value)} required />
      </SettingField>

      <SettingField id="place-city" label="Miasto" hint={ADMIN_PLACE_FIELD_HELP.city}>
        <select value={cityId} onChange={(event) => onCityChange(event.target.value)} required>
          {availableCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </SettingField>

      <SettingField
        id="place-location"
        label="Lokalizacja"
        hint={ADMIN_PLACE_FIELD_HELP.location}
        controlMode="composite"
      >
        <LocationPicker
          mode="modal-only"
          previewLabel={selectedCityName}
          position={location}
          saveStatus={locationAutoSaveStatus}
          onChange={onLocationChange}
        />
      </SettingField>

      <SettingField id="place-description" label="Opis" hint={ADMIN_PLACE_FIELD_HELP.description}>
        <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={4} />
      </SettingField>

      <SettingField id="place-local-comment" label="Lokalny komentarz" hint={ADMIN_PLACE_FIELD_HELP["local-comment"]}>
        <textarea value={localComment} onChange={(event) => onLocalCommentChange(event.target.value)} rows={3} />
      </SettingField>

      <div className="field-row">
        <SettingField
          id="place-editorial-priority"
          label="Priorytet redakcji"
          hint={ADMIN_PLACE_FIELD_HELP["editorial-priority"]}
        >
          <input
            type="number"
            min={MIN_PLACE_PRIORITY}
            max={MAX_PLACE_PRIORITY}
            step={PLACE_PRIORITY_STEP}
            value={weight}
            onChange={(event) => onWeightChange(event.target.value)}
            required
          />
        </SettingField>
        <SettingField id="place-status" label="Status" hint={ADMIN_PLACE_FIELD_HELP.status}>
          <select value={status} onChange={(event) => onStatusChange(event.target.value as PlaceStatus)}>
            {ADMIN_PLACE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingField>
      </div>
    </>
  );
}
