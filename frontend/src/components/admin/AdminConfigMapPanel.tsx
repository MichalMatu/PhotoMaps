import type { AppConfigDraft } from "./appConfigForm";

type Props = {
  map: AppConfigDraft["map"];
  onCenterChange: (axis: "lat" | "lon", value: number) => void;
  onZoomChange: (zoom: number) => void;
};

export function AdminConfigMapPanel({ map, onCenterChange, onZoomChange }: Props) {
  return (
    <fieldset className="ui-fieldset admin-config-panel">
      <legend>Mapa</legend>
      <div className="field-row">
        <label>
          Szerokość
          <input
            type="number"
            step="0.000001"
            value={map.fallback_center.lat}
            onChange={(event) => onCenterChange("lat", Number(event.target.value))}
          />
        </label>
        <label>
          Długość
          <input
            type="number"
            step="0.000001"
            value={map.fallback_center.lon}
            onChange={(event) => onCenterChange("lon", Number(event.target.value))}
          />
        </label>
      </div>
      <label>
        Zoom
        <input
          type="number"
          min="1"
          max="20"
          value={map.fallback_zoom}
          onChange={(event) => onZoomChange(Number(event.target.value))}
        />
      </label>
    </fieldset>
  );
}
