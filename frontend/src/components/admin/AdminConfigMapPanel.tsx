import { SettingField } from "../ui/SettingField";
import type { AppConfigDraft } from "./appConfigForm";
import { ADMIN_MAP_SETTING_HELP } from "./adminMapSettingHelp";

type Props = {
  map: AppConfigDraft["map"];
  onCenterChange: (axis: "lat" | "lon", value: number) => void;
  onMarkerBaseSizeChange: (axis: "height" | "width", value: number) => void;
  onMarkerDensityChange: (
    key:
      | "full_density_zoom"
      | "marker_viewport_area"
      | "max_zoom_fill_ratio"
      | "min_zoom"
      | "min_zoom_fill_ratio"
      | "zoom_curve",
    value: number,
  ) => void;
  onMarkerPriorityChange: (
    key: "editorial_weight_multiplier" | "memory_count_multiplier" | "photo_count_sqrt_multiplier" | "score_multiplier",
    value: number,
  ) => void;
  onMarkerPriorityScaleChange: (key: "curve" | "max_scale" | "min_scale", value: number) => void;
  onMarkerRenderScaleChange: (key: "max_render_scale" | "min_render_scale", value: number) => void;
  onZoomChange: (zoom: number) => void;
};

export function AdminConfigMapPanel({
  map,
  onCenterChange,
  onMarkerBaseSizeChange,
  onMarkerDensityChange,
  onMarkerPriorityChange,
  onMarkerPriorityScaleChange,
  onMarkerRenderScaleChange,
  onZoomChange,
}: Props) {
  return (
    <div className="admin-config-map-settings">
      <fieldset className="ui-fieldset admin-config-panel">
        <legend>Start mapy</legend>
        <div className="field-row">
          <SettingField id="fallback-center-lat" label="Szerokość" hint={ADMIN_MAP_SETTING_HELP["fallback-center-lat"]}>
            <input
              type="number"
              step="0.000001"
              value={map.fallback_center.lat}
              onChange={(event) => onCenterChange("lat", Number(event.target.value))}
            />
          </SettingField>
          <SettingField id="fallback-center-lon" label="Długość" hint={ADMIN_MAP_SETTING_HELP["fallback-center-lon"]}>
            <input
              type="number"
              step="0.000001"
              value={map.fallback_center.lon}
              onChange={(event) => onCenterChange("lon", Number(event.target.value))}
            />
          </SettingField>
        </div>
        <SettingField id="fallback-zoom" label="Zoom" hint={ADMIN_MAP_SETTING_HELP["fallback-zoom"]}>
          <input
            type="number"
            min="1"
            max="20"
            value={map.fallback_zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
          />
        </SettingField>
      </fieldset>

      <fieldset className="ui-fieldset admin-config-panel">
        <legend>Kafelki miejsc</legend>
        <div className="field-row">
          <SettingField id="marker-base-width" label="Szerokość px" hint={ADMIN_MAP_SETTING_HELP["marker-base-width"]}>
            <input
              type="number"
              min="32"
              max="240"
              value={map.marker_scale.base_size.width}
              onChange={(event) => onMarkerBaseSizeChange("width", Number(event.target.value))}
            />
          </SettingField>
          <SettingField id="marker-base-height" label="Wysokość px" hint={ADMIN_MAP_SETTING_HELP["marker-base-height"]}>
            <input
              type="number"
              min="24"
              max="220"
              value={map.marker_scale.base_size.height}
              onChange={(event) => onMarkerBaseSizeChange("height", Number(event.target.value))}
            />
          </SettingField>
        </div>
        <div className="field-row">
          <SettingField
            id="marker-min-render-scale"
            label="Min. skala"
            hint={ADMIN_MAP_SETTING_HELP["marker-min-render-scale"]}
          >
            <input
              type="number"
              min="0.25"
              max="3"
              step="0.01"
              value={map.marker_scale.min_render_scale}
              onChange={(event) => onMarkerRenderScaleChange("min_render_scale", Number(event.target.value))}
            />
          </SettingField>
          <SettingField
            id="marker-max-render-scale"
            label="Maks. skala"
            hint={ADMIN_MAP_SETTING_HELP["marker-max-render-scale"]}
          >
            <input
              type="number"
              min="0.25"
              max="3"
              step="0.01"
              value={map.marker_scale.max_render_scale}
              onChange={(event) => onMarkerRenderScaleChange("max_render_scale", Number(event.target.value))}
            />
          </SettingField>
        </div>
        <div className="field-row">
          <SettingField
            id="marker-priority-min-scale"
            label="Niski priorytet"
            hint={ADMIN_MAP_SETTING_HELP["marker-priority-min-scale"]}
          >
            <input
              type="number"
              min="0.25"
              max="3"
              step="0.01"
              value={map.marker_scale.priority.min_scale}
              onChange={(event) => onMarkerPriorityScaleChange("min_scale", Number(event.target.value))}
            />
          </SettingField>
          <SettingField
            id="marker-priority-max-scale"
            label="Wysoki priorytet"
            hint={ADMIN_MAP_SETTING_HELP["marker-priority-max-scale"]}
          >
            <input
              type="number"
              min="0.25"
              max="3"
              step="0.01"
              value={map.marker_scale.priority.max_scale}
              onChange={(event) => onMarkerPriorityScaleChange("max_scale", Number(event.target.value))}
            />
          </SettingField>
        </div>
        <SettingField
          id="marker-priority-curve"
          label="Krzywa priorytetu"
          hint={ADMIN_MAP_SETTING_HELP["marker-priority-curve"]}
        >
          <input
            type="number"
            min="0.25"
            max="3"
            step="0.01"
            value={map.marker_scale.priority.curve}
            onChange={(event) => onMarkerPriorityScaleChange("curve", Number(event.target.value))}
          />
        </SettingField>
      </fieldset>

      <fieldset className="ui-fieldset admin-config-panel">
        <legend>Widoczność kafli</legend>
        <SettingField
          id="marker-density-area"
          label="Powierzchnia na kafel"
          hint={ADMIN_MAP_SETTING_HELP["marker-density-area"]}
        >
          <input
            type="number"
            min="3000"
            max="80000"
            step="500"
            value={map.marker_density.marker_viewport_area}
            onChange={(event) => onMarkerDensityChange("marker_viewport_area", Number(event.target.value))}
          />
        </SettingField>
        <div className="field-row">
          <SettingField
            id="marker-density-min-zoom"
            label="Zoom startowy"
            hint={ADMIN_MAP_SETTING_HELP["marker-density-min-zoom"]}
          >
            <input
              type="number"
              min="1"
              max="20"
              step="0.25"
              value={map.marker_density.min_zoom}
              onChange={(event) => onMarkerDensityChange("min_zoom", Number(event.target.value))}
            />
          </SettingField>
          <SettingField
            id="marker-density-full-zoom"
            label="Zoom pełny"
            hint={ADMIN_MAP_SETTING_HELP["marker-density-full-zoom"]}
          >
            <input
              type="number"
              min="1"
              max="20"
              step="0.25"
              value={map.marker_density.full_density_zoom}
              onChange={(event) => onMarkerDensityChange("full_density_zoom", Number(event.target.value))}
            />
          </SettingField>
        </div>
        <div className="field-row">
          <SettingField
            id="marker-density-min-fill"
            label="Min. wypełnienie"
            hint={ADMIN_MAP_SETTING_HELP["marker-density-min-fill"]}
          >
            <input
              type="number"
              min="0.02"
              max="1.5"
              step="0.01"
              value={map.marker_density.min_zoom_fill_ratio}
              onChange={(event) => onMarkerDensityChange("min_zoom_fill_ratio", Number(event.target.value))}
            />
          </SettingField>
          <SettingField
            id="marker-density-max-fill"
            label="Maks. wypełnienie"
            hint={ADMIN_MAP_SETTING_HELP["marker-density-max-fill"]}
          >
            <input
              type="number"
              min="0.02"
              max="1.5"
              step="0.01"
              value={map.marker_density.max_zoom_fill_ratio}
              onChange={(event) => onMarkerDensityChange("max_zoom_fill_ratio", Number(event.target.value))}
            />
          </SettingField>
        </div>
        <SettingField
          id="marker-density-curve"
          label="Krzywa gęstości"
          hint={ADMIN_MAP_SETTING_HELP["marker-density-curve"]}
        >
          <input
            type="number"
            min="0.25"
            max="4"
            step="0.01"
            value={map.marker_density.zoom_curve}
            onChange={(event) => onMarkerDensityChange("zoom_curve", Number(event.target.value))}
          />
        </SettingField>
      </fieldset>

      <fieldset className="ui-fieldset admin-config-panel">
        <legend>Ranking miejsc</legend>
        <div className="field-row">
          <SettingField
            id="marker-priority-editorial"
            label="Priorytet redakcji"
            hint={ADMIN_MAP_SETTING_HELP["marker-priority-editorial"]}
          >
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={map.marker_priority.editorial_weight_multiplier}
              onChange={(event) => onMarkerPriorityChange("editorial_weight_multiplier", Number(event.target.value))}
            />
          </SettingField>
          <SettingField
            id="marker-priority-photos"
            label="Zdjęcia"
            hint={ADMIN_MAP_SETTING_HELP["marker-priority-photos"]}
          >
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={map.marker_priority.photo_count_sqrt_multiplier}
              onChange={(event) => onMarkerPriorityChange("photo_count_sqrt_multiplier", Number(event.target.value))}
            />
          </SettingField>
        </div>
        <div className="field-row">
          <SettingField
            id="marker-priority-memories"
            label="Pamiątki"
            hint={ADMIN_MAP_SETTING_HELP["marker-priority-memories"]}
          >
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={map.marker_priority.memory_count_multiplier}
              onChange={(event) => onMarkerPriorityChange("memory_count_multiplier", Number(event.target.value))}
            />
          </SettingField>
          <SettingField id="marker-priority-score" label="Score" hint={ADMIN_MAP_SETTING_HELP["marker-priority-score"]}>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={map.marker_priority.score_multiplier}
              onChange={(event) => onMarkerPriorityChange("score_multiplier", Number(event.target.value))}
            />
          </SettingField>
        </div>
      </fieldset>
    </div>
  );
}
