import type { FormEvent } from "react";

import type { AppConfigMap, City, CityStatus } from "../../api/types";
import { ADMIN_CITY_STATUS_OPTIONS } from "./adminStatusUi";
import { LocationPicker } from "./LocationPicker";
import { SystemModal } from "./SystemModal";

type Props = {
  canSave: boolean;
  cityId: string;
  editingCity: City | null;
  isSaving: boolean;
  lat: string;
  lon: string;
  mapFallback: AppConfigMap | null;
  name: string;
  region: string;
  onCityIdChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onLatChange: (value: string) => void;
  onLonChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onStatusChange: (value: CityStatus) => void;
  onZoomChange: (value: string) => void;
  sortOrder: string;
  status: CityStatus;
  zoom: string;
};

const CITY_LOCATION_FALLBACK = { lat: 0, lon: 0 };

function parseNumber(value: string): number | null {
  const normalizedValue = value.trim().replace(",", ".");
  if (!normalizedValue) {
    return null;
  }
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampZoom(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 13;
  }
  return Math.min(19, Math.max(1, parsed));
}

export function CityFormModal({
  canSave,
  cityId,
  editingCity,
  isSaving,
  lat,
  lon,
  mapFallback,
  name,
  region,
  onCityIdChange,
  onClose,
  onConfirm,
  onLatChange,
  onLonChange,
  onNameChange,
  onRegionChange,
  onSortOrderChange,
  onStatusChange,
  onZoomChange,
  sortOrder,
  status,
  zoom,
}: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || isSaving) {
      return;
    }

    onConfirm();
  }

  const latitude = parseNumber(lat);
  const longitude = parseNumber(lon);
  const location =
    latitude !== null && longitude !== null
      ? { lat: latitude, lon: longitude }
      : (mapFallback?.fallback_center ?? CITY_LOCATION_FALLBACK);
  const mapZoom = clampZoom(zoom);

  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmDisabled={!canSave}
      confirmFormId="city-form-modal"
      confirmLabel={editingCity ? "Zapisz miasto" : "Dodaj miasto"}
      eyebrow="Miejsca"
      isBusy={isSaving}
      size="wide"
      title={editingCity ? "Edytuj miasto" : "Dodaj miasto"}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <form id="city-form-modal" className="ui-form city-form city-form--modal" onSubmit={handleSubmit}>
        <label>
          ID
          <input
            value={cityId}
            disabled={Boolean(editingCity)}
            onChange={(event) => onCityIdChange(event.target.value)}
            placeholder="np. krakow"
            required
          />
        </label>
        <label>
          Nazwa
          <input value={name} onChange={(event) => onNameChange(event.target.value)} required />
        </label>
        <label>
          Województwo
          <input value={region} onChange={(event) => onRegionChange(event.target.value)} required />
        </label>
        <label>
          Szerokość
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(event) => onLatChange(event.target.value)}
            required
          />
        </label>
        <label>
          Długość
          <input
            type="number"
            step="0.000001"
            value={lon}
            onChange={(event) => onLonChange(event.target.value)}
            required
          />
        </label>
        <div className="city-location-field">
          <span>Centrum miasta</span>
          <LocationPicker
            defaultZoom={mapZoom}
            largeZoom={mapZoom}
            lookupErrorMessage="Nie udało się sprawdzić miasta pod pinezką."
            modalEyebrow="Miejsca"
            modalTitle="Lokalizacja miasta"
            position={location}
            onChange={(position) => {
              onLatChange(String(position.lat));
              onLonChange(String(position.lon));
            }}
          />
        </div>
        <label>
          Startowy zoom mapy
          <input type="number" min="1" max="19" value={zoom} onChange={(event) => onZoomChange(event.target.value)} />
        </label>
        <label>
          Kolejność
          <input type="number" value={sortOrder} onChange={(event) => onSortOrderChange(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => onStatusChange(event.target.value as CityStatus)}>
            {ADMIN_CITY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>
    </SystemModal>
  );
}
