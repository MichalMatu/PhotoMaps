import { describe, expect, it } from "vitest";

import type { AppConfig } from "../../api/types";
import {
  appConfigPayloadFromDraft,
  createAppConfigDraft,
  nextCustomFieldDraft,
  suggestCustomFieldKey,
} from "./appConfigForm";

const appConfig: AppConfig = {
  branding: {
    logo_url: null,
    primary_color: "#2563eb",
  },
  labels: {
    categories: "kategorie",
    category: "kategoria",
    guide: "kolekcja miejsc",
    guides: "kolekcje miejsc",
    place: "miejsce",
    places: "miejsca",
  },
  locale: "pl-PL",
  map: {
    fallback_center: {
      lat: 52,
      lon: 19,
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
  },
  place_custom_fields: [
    {
      key: "opening_hours",
      label: "Godziny otwarcia",
      options: null,
      public: true,
      required: false,
      sort_order: 10,
      type: "text",
    },
  ],
  product_name: "PhotoMap",
};

describe("appConfigForm", () => {
  it("builds an app config payload from editable draft values", () => {
    const draft = createAppConfigDraft(appConfig);
    draft.product_name = " MallMap ";
    draft.labels.place = " lokal ";
    draft.map.marker_density.marker_viewport_area = 24_000;
    draft.map.marker_priority.editorial_weight_multiplier = 18;
    draft.map.marker_scale.base_size.width = 96;
    draft.place_custom_fields.push({
      ...nextCustomFieldDraft(draft.place_custom_fields),
      label: "Dostępność",
      optionsText: "pełna\nczęściowa",
      type: "select",
    });

    const result = appConfigPayloadFromDraft(draft);

    expect(result.errors).toEqual([]);
    expect(result.payload?.product_name).toBe("MallMap");
    expect(result.payload?.labels.place).toBe("lokal");
    expect(result.payload?.map.marker_density.marker_viewport_area).toBe(24_000);
    expect(result.payload?.map.marker_priority.editorial_weight_multiplier).toBe(18);
    expect(result.payload?.map.marker_scale.base_size.width).toBe(96);
    expect(result.payload?.place_custom_fields[1]).toMatchObject({
      key: "dostepnosc",
      label: "Dostępność",
      options: ["pełna", "częściowa"],
      type: "select",
    });
  });

  it("reports invalid branding, map and duplicated field keys", () => {
    const draft = createAppConfigDraft(appConfig);
    draft.branding.primary_color = "blue";
    draft.map.fallback_center.lat = 120;
    draft.map.marker_density.min_zoom = 16;
    draft.map.marker_density.full_density_zoom = 12;
    draft.map.marker_scale.priority.min_scale = 2;
    draft.map.marker_scale.priority.max_scale = 1;
    draft.place_custom_fields.push({
      ...nextCustomFieldDraft(draft.place_custom_fields),
      key: "opening_hours",
      label: "Inne godziny",
    });

    const result = appConfigPayloadFromDraft(draft);

    expect(result.payload).toBeNull();
    expect(result.errors).toContain("Kolor główny musi mieć format #RRGGBB.");
    expect(result.errors).toContain("Domyślna szerokość mapy musi być między -90 i 90.");
    expect(result.errors).toContain("Zoom startowy gęstości nie może być większy niż zoom pełnej gęstości.");
    expect(result.errors).toContain("Skala niskiego priorytetu nie może być większa niż wysokiego.");
    expect(result.errors).toContain("Inne godziny: klucz pola jest zdublowany.");
  });

  it("normalizes Polish labels into safe technical keys", () => {
    expect(suggestCustomFieldKey("Piętro / numer lokalu")).toBe("pietro_numer_lokalu");
  });
});
