import { Maximize2 } from "lucide-react";
import { useState } from "react";

import { LocationPickerMap } from "./LocationPickerMap";
import { SystemModal } from "./SystemModal";
import {
  getLocationLookupPreview,
  getLocationPickerPositionLabel,
  type LocationLookupState,
  type LocationPickerPosition,
  reverseLookupLocation,
} from "./locationPickerLookup";
import { placeLocationAutoSaveLabel, type PlaceLocationAutoSaveStatus } from "./placeLocationAutoSave";

type Props = {
  onChange: (position: LocationPickerPosition) => void;
  position: LocationPickerPosition;
  defaultZoom?: number;
  largeZoom?: number;
  mode?: "inline-map" | "modal-only";
  modalEyebrow?: string;
  modalTitle?: string;
  previewLabel?: string;
  lookupErrorMessage?: string;
  saveStatus?: PlaceLocationAutoSaveStatus;
};

function ReverseLookupSummary({ lookup }: { lookup: LocationLookupState }) {
  if (lookup.status === "idle") {
    return <p className="location-lookup-hint">Wynik pojawi się po sprawdzeniu pinezki.</p>;
  }

  if (lookup.status === "loading") {
    return <p className="location-lookup-hint">Sprawdzam miejsce...</p>;
  }

  if (lookup.status === "error") {
    return <p className="location-lookup-error">{lookup.message}</p>;
  }

  const title = lookup.result.name || lookup.result.display_name || "Brak nazwy w OpenStreetMap";
  const details = [lookup.result.category, lookup.result.type].filter(Boolean).join(" / ");

  return (
    <div className="location-lookup-result">
      <strong>{title}</strong>
      {details ? <span>{details}</span> : null}
      {lookup.result.display_name && lookup.result.display_name !== title ? <p>{lookup.result.display_name}</p> : null}
    </div>
  );
}

function LocationReadout({
  lookup,
  position,
  previewLabel,
  saveStatus = "idle",
}: {
  lookup: LocationLookupState;
  position: LocationPickerPosition;
  previewLabel?: string;
  saveStatus?: PlaceLocationAutoSaveStatus;
}) {
  const lookupPreview = getLocationLookupPreview(lookup);
  const title = lookupPreview?.title ?? previewLabel ?? "Pozycja";
  const details = lookupPreview?.details;
  const positionLabel = getLocationPickerPositionLabel(position);
  const saveStatusLabel = placeLocationAutoSaveLabel(saveStatus);

  return (
    <div className="location-readout">
      <strong>{title}</strong>
      {details ? <span>{details}</span> : null}
      {saveStatusLabel ? (
        <span className={`location-save-status location-save-status--${saveStatus}`}>{saveStatusLabel}</span>
      ) : null}
      <small>{positionLabel}</small>
    </div>
  );
}

type LargeLocationPickerModalProps = Props & {
  lookup: LocationLookupState;
  onClose: () => void;
  onLookup: () => void;
};

function LargeLocationPickerModal({
  largeZoom = 17,
  lookup,
  modalEyebrow = "Miejsca",
  modalTitle = "Lokalizacja miejsca",
  onChange,
  onClose,
  onLookup,
  position,
  saveStatus = "idle",
}: LargeLocationPickerModalProps) {
  const saveStatusLabel = placeLocationAutoSaveLabel(saveStatus);

  return (
    <SystemModal eyebrow={modalEyebrow} showActions={false} size="large" title={modalTitle} onClose={onClose}>
      <div className="location-modal-body">
        <p className="location-modal-readout">
          <span>{getLocationPickerPositionLabel(position)}</span>
          {saveStatusLabel ? (
            <span className={`location-save-status location-save-status--${saveStatus}`}>{saveStatusLabel}</span>
          ) : null}
        </p>
        <div className="location-modal-map">
          <LocationPickerMap position={position} onChange={onChange} zoom={largeZoom} />
        </div>
        <footer className="location-modal-footer">
          <button type="button" onClick={onLookup} disabled={lookup.status === "loading"}>
            {lookup.status === "loading" ? "Sprawdzam..." : "Sprawdź pod pinezką"}
          </button>
          <ReverseLookupSummary lookup={lookup} />
        </footer>
      </div>
    </SystemModal>
  );
}

export function LocationPicker({
  defaultZoom = 15,
  largeZoom,
  lookupErrorMessage = "Nie udało się sprawdzić miejsca pod pinezką.",
  mode = "inline-map",
  modalEyebrow,
  modalTitle,
  onChange,
  position,
  previewLabel,
  saveStatus,
}: Props) {
  const [isLargeMapOpen, setIsLargeMapOpen] = useState(false);
  const [lookup, setLookup] = useState<LocationLookupState>({ status: "idle" });

  const handleChange = (nextPosition: LocationPickerPosition) => {
    setLookup({ status: "idle" });
    onChange(nextPosition);
  };

  const handleLookup = async () => {
    setLookup({ status: "loading" });

    try {
      const result = await reverseLookupLocation(position);
      setLookup({ status: "success", result });
    } catch {
      setLookup({ status: "error", message: lookupErrorMessage });
    }
  };

  return (
    <div className={mode === "modal-only" ? "location-picker location-picker--modal-only" : "location-picker"}>
      {mode === "inline-map" ? (
        <div className="location-picker-map">
          <LocationPickerMap position={position} onChange={handleChange} zoom={defaultZoom} />
        </div>
      ) : null}
      <div className="location-picker-footer">
        <LocationReadout lookup={lookup} position={position} previewLabel={previewLabel} saveStatus={saveStatus} />
        <button className="location-expand-button" type="button" onClick={() => setIsLargeMapOpen(true)}>
          <Maximize2 aria-hidden="true" size={16} />
          Duża mapa
        </button>
      </div>
      {isLargeMapOpen ? (
        <LargeLocationPickerModal
          lookup={lookup}
          defaultZoom={defaultZoom}
          largeZoom={largeZoom}
          modalEyebrow={modalEyebrow}
          modalTitle={modalTitle}
          position={position}
          saveStatus={saveStatus}
          lookupErrorMessage={lookupErrorMessage}
          onChange={handleChange}
          onClose={() => setIsLargeMapOpen(false)}
          onLookup={handleLookup}
        />
      ) : null}
    </div>
  );
}
