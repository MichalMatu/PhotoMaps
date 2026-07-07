import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminConfigMapPanel } from "./AdminConfigMapPanel";
import type { AppConfigDraft } from "./appConfigForm";
import { ADMIN_MAP_SETTING_IDS } from "./adminMapSettingHelp";

const map = {
  fallback_center: {
    lat: 51.1079,
    lon: 17.0385,
  },
  fallback_zoom: 13,
  marker_density: {
    full_density_zoom: 15,
    marker_viewport_area: 18_000,
    max_zoom_fill_ratio: 1,
    min_zoom: 6,
    min_zoom_fill_ratio: 0.12,
    zoom_curve: 1.35,
  },
  marker_priority: {
    editorial_weight_multiplier: 12,
    memory_count_multiplier: 2,
    photo_count_sqrt_multiplier: 3.2,
    score_multiplier: 0.28,
  },
  marker_scale: {
    base_size: {
      height: 58,
      width: 72,
    },
    max_render_scale: 1.9,
    min_render_scale: 0.55,
    priority: {
      curve: 1.12,
      max_scale: 1.9,
      min_scale: 0.72,
    },
  },
} satisfies AppConfigDraft["map"];

const noop = () => undefined;

describe("AdminConfigMapPanel", () => {
  it("renders a help trigger and tooltip for every map setting", () => {
    const markup = renderToStaticMarkup(
      <AdminConfigMapPanel
        map={map}
        onCenterChange={noop}
        onMarkerBaseSizeChange={noop}
        onMarkerDensityChange={noop}
        onMarkerPriorityChange={noop}
        onMarkerPriorityScaleChange={noop}
        onMarkerRenderScaleChange={noop}
        onZoomChange={noop}
      />,
    );

    expect(markup.match(/role="tooltip"/g)).toHaveLength(ADMIN_MAP_SETTING_IDS.length);

    for (const settingId of ADMIN_MAP_SETTING_IDS) {
      expect(markup).toContain(`id="${settingId}"`);
      expect(markup).toContain(`id="${settingId}-hint"`);
      expect(markup).toContain(`aria-describedby="${settingId}-hint"`);
    }
  });
});
