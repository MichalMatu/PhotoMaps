import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import { SystemModal } from "./SystemModal";

type Position = {
  lat: number;
  lon: number;
};

type Props = {
  onChange: (position: Position) => void;
  position: Position;
  defaultZoom?: number;
  largeZoom?: number;
  modalEyebrow?: string;
  modalTitle?: string;
  lookupErrorMessage?: string;
};

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: ReverseLookupResult }
  | { status: "error"; message: string };

type ReverseLookupResult = {
  category?: string;
  display_name?: string;
  name?: string;
  type?: string;
};

const pickerIcon = L.divIcon({
  className: "place-marker-icon",
  html: "<span></span>",
  iconAnchor: [14, 34],
  iconSize: [28, 34],
});

function roundedPosition(lat: number, lon: number): Position {
  return {
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
  };
}

function getPositionLabel(position: Position) {
  return `${position.lat.toFixed(6)}, ${position.lon.toFixed(6)}`;
}

async function reverseLookup(position: Position): Promise<ReverseLookupResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(position.lat));
  url.searchParams.set("lon", String(position.lon));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pl,en");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse lookup failed: ${response.status}`);
  }

  return (await response.json()) as ReverseLookupResult;
}

function LocationPickerEvents({ onChange }: Pick<Props, "onChange">) {
  useMapEvents({
    click: (event) => {
      onChange(roundedPosition(event.latlng.lat, event.latlng.lng));
    },
  });

  return null;
}

function LocationMapSync({ position }: Pick<Props, "position">) {
  const map = useMap();

  useEffect(() => {
    const nextCenter: [number, number] = [position.lat, position.lon];
    map.setView(nextCenter, map.getZoom(), { animate: true });
    const frameId = window.requestAnimationFrame(() => map.invalidateSize());
    const timeoutId = window.setTimeout(() => map.invalidateSize(), 250);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [map, position.lat, position.lon]);

  return null;
}

function LocationMap({ onChange, position, zoom = 15 }: Pick<Props, "onChange" | "position"> & { zoom?: number }) {
  const markerPosition: [number, number] = [position.lat, position.lon];

  return (
    <MapContainer center={markerPosition} zoom={zoom} className="location-map" scrollWheelZoom>
      <LocationMapSync position={position} />
      <LocationPickerEvents onChange={onChange} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        draggable
        eventHandlers={{
          dragend: (event) => {
            const marker = event.target as L.Marker;
            const nextPosition = marker.getLatLng();
            onChange(roundedPosition(nextPosition.lat, nextPosition.lng));
          },
        }}
        icon={pickerIcon}
        position={markerPosition}
      />
    </MapContainer>
  );
}

function ReverseLookupSummary({ lookup }: { lookup: LookupState }) {
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

type LargeLocationPickerModalProps = Props & {
  lookup: LookupState;
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
}: LargeLocationPickerModalProps) {
  return (
    <SystemModal eyebrow={modalEyebrow} showActions={false} size="large" title={modalTitle} onClose={onClose}>
      <div className="location-modal-body">
        <p className="location-modal-readout">{getPositionLabel(position)}</p>
        <div className="location-modal-map">
          <LocationMap position={position} onChange={onChange} zoom={largeZoom} />
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
  modalEyebrow,
  modalTitle,
  onChange,
  position,
}: Props) {
  const [isLargeMapOpen, setIsLargeMapOpen] = useState(false);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });

  const handleChange = (nextPosition: Position) => {
    setLookup({ status: "idle" });
    onChange(nextPosition);
  };

  const handleLookup = async () => {
    setLookup({ status: "loading" });

    try {
      const result = await reverseLookup(position);
      setLookup({ status: "success", result });
    } catch {
      setLookup({ status: "error", message: lookupErrorMessage });
    }
  };

  return (
    <div className="location-picker">
      <div className="location-picker-map">
        <LocationMap position={position} onChange={handleChange} zoom={defaultZoom} />
      </div>
      <div className="location-picker-footer">
        <p className="location-readout">{getPositionLabel(position)}</p>
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
          lookupErrorMessage={lookupErrorMessage}
          onChange={handleChange}
          onClose={() => setIsLargeMapOpen(false)}
          onLookup={handleLookup}
        />
      ) : null}
    </div>
  );
}
