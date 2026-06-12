import type { City, CityStatus } from "../../api/client";
import { LocationPicker } from "./LocationPicker";
import { SystemModal } from "./SystemModal";

type Props = {
  canSave: boolean;
  cityId: string;
  editingCity: City | null;
  isSaving: boolean;
  lat: string;
  lon: string;
  name: string;
  onCityIdChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onLatChange: (value: string) => void;
  onLonChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onStatusChange: (value: CityStatus) => void;
  onZoomChange: (value: string) => void;
  sortOrder: string;
  status: CityStatus;
  zoom: string;
};

const CITY_LOCATION_FALLBACK = {
  lat: 51.1079,
  lon: 17.0385,
};

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
  name,
  onCityIdChange,
  onClose,
  onConfirm,
  onLatChange,
  onLonChange,
  onNameChange,
  onSortOrderChange,
  onStatusChange,
  onZoomChange,
  sortOrder,
  status,
  zoom,
}: Props) {
  const latitude = parseNumber(lat);
  const longitude = parseNumber(lon);
  const location = latitude !== null && longitude !== null ? { lat: latitude, lon: longitude } : CITY_LOCATION_FALLBACK;
  const mapZoom = clampZoom(zoom);

  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmDisabled={!canSave}
      confirmLabel={editingCity ? "Zapisz miasto" : "Dodaj miasto"}
      eyebrow="Miasta"
      isBusy={isSaving}
      title={editingCity ? "Edytuj miasto" : "Dodaj miasto"}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="city-form city-form--modal">
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
            modalEyebrow="Miasta"
            modalTitle="Lokalizacja miasta"
            position={location}
            onChange={(position) => {
              onLatChange(String(position.lat));
              onLonChange(String(position.lon));
            }}
          />
        </div>
        <label>
          Zoom
          <input type="number" min="1" max="19" value={zoom} onChange={(event) => onZoomChange(event.target.value)} />
        </label>
        <label>
          Kolejność
          <input type="number" value={sortOrder} onChange={(event) => onSortOrderChange(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => onStatusChange(event.target.value as CityStatus)}>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>
    </SystemModal>
  );
}
