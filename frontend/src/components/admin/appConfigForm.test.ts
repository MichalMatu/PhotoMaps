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
    draft.place_custom_fields.push({
      ...nextCustomFieldDraft(draft.place_custom_fields),
      key: "opening_hours",
      label: "Inne godziny",
    });

    const result = appConfigPayloadFromDraft(draft);

    expect(result.payload).toBeNull();
    expect(result.errors).toContain("Kolor główny musi mieć format #RRGGBB.");
    expect(result.errors).toContain("Domyślna szerokość mapy musi być między -90 i 90.");
    expect(result.errors).toContain("Inne godziny: klucz pola jest zdublowany.");
  });

  it("normalizes Polish labels into safe technical keys", () => {
    expect(suggestCustomFieldKey("Piętro / numer lokalu")).toBe("pietro_numer_lokalu");
  });
});
