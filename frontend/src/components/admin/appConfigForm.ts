import type { AppConfig, PlaceCustomFieldDefinition, PlaceCustomFieldType } from "../../api/types";

export type AppConfigLabelKey = "place" | "places" | "category" | "categories" | "guide" | "guides";

export type AppConfigCustomFieldDraft = Omit<PlaceCustomFieldDefinition, "options"> & {
  isNew: boolean;
  optionsText: string;
};

export type AppConfigDraft = Omit<AppConfig, "place_custom_fields"> & {
  place_custom_fields: AppConfigCustomFieldDraft[];
};

export type AppConfigDraftResult = {
  errors: string[];
  payload: AppConfig | null;
};

export const APP_CONFIG_LABEL_GROUPS: ReadonlyArray<{
  label: string;
  pluralKey: AppConfigLabelKey;
  singularKey: AppConfigLabelKey;
}> = [
  { label: "Miejsca", pluralKey: "places", singularKey: "place" },
  { label: "Kategorie", pluralKey: "categories", singularKey: "category" },
  { label: "Kolekcje miejsc", pluralKey: "guides", singularKey: "guide" },
];

export const PLACE_CUSTOM_FIELD_TYPES: ReadonlyArray<{ key: PlaceCustomFieldType; label: string }> = [
  { key: "text", label: "Tekst" },
  { key: "textarea", label: "Długi tekst" },
  { key: "number", label: "Liczba" },
  { key: "url", label: "URL" },
  { key: "select", label: "Lista wyboru" },
  { key: "boolean", label: "Tak/Nie" },
  { key: "date", label: "Data" },
];

export function createAppConfigDraft(config: AppConfig): AppConfigDraft {
  return {
    ...config,
    labels: { ...config.labels },
    branding: { ...config.branding },
    map: {
      fallback_center: { ...config.map.fallback_center },
      fallback_zoom: config.map.fallback_zoom,
      marker_density: { ...config.map.marker_density },
      marker_priority: { ...config.map.marker_priority },
      marker_scale: {
        base_size: { ...config.map.marker_scale.base_size },
        max_render_scale: config.map.marker_scale.max_render_scale,
        min_render_scale: config.map.marker_scale.min_render_scale,
        priority: { ...config.map.marker_scale.priority },
      },
    },
    place_custom_fields: [...config.place_custom_fields]
      .sort((firstField, secondField) => firstField.sort_order - secondField.sort_order)
      .map((field) => ({
        ...field,
        isNew: false,
        optionsText: (field.options ?? []).join("\n"),
      })),
  };
}

export function nextCustomFieldDraft(existingFields: AppConfigCustomFieldDraft[]): AppConfigCustomFieldDraft {
  const maxSortOrder = existingFields.reduce((current, field) => Math.max(current, Number(field.sort_order) || 0), 0);
  return {
    isNew: true,
    key: "",
    label: "",
    optionsText: "",
    public: true,
    required: false,
    sort_order: maxSortOrder + 10,
    type: "text",
  };
}

export function appConfigPayloadFromDraft(draft: AppConfigDraft): AppConfigDraftResult {
  const errors: string[] = [];
  const productName = draft.product_name.trim();
  const locale = draft.locale.trim();
  const labels = appConfigLabelsFromDraft(draft, errors);
  const primaryColor = draft.branding.primary_color.trim();
  const logoUrl = draft.branding.logo_url?.trim() || null;
  const customFields = customFieldDefinitionsFromDraft(draft.place_custom_fields, errors);

  if (!productName) {
    errors.push("Nazwa produktu jest wymagana.");
  }
  if (!locale) {
    errors.push("Język jest wymagany.");
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    errors.push("Kolor główny musi mieć format #RRGGBB.");
  }
  if (logoUrl && !isHttpUrl(logoUrl)) {
    errors.push("Logo URL musi być poprawnym adresem http albo https.");
  }
  if (!isFiniteMapNumber(draft.map.fallback_center.lat, -90, 90)) {
    errors.push("Domyślna szerokość mapy musi być między -90 i 90.");
  }
  if (!isFiniteMapNumber(draft.map.fallback_center.lon, -180, 180)) {
    errors.push("Domyślna długość mapy musi być między -180 i 180.");
  }
  if (
    !Number.isInteger(Number(draft.map.fallback_zoom)) ||
    draft.map.fallback_zoom < 1 ||
    draft.map.fallback_zoom > 20
  ) {
    errors.push("Domyślny zoom mapy musi być liczbą od 1 do 20.");
  }
  validateMapSettings(draft, errors);

  if (errors.length > 0) {
    return { errors, payload: null };
  }

  return {
    errors: [],
    payload: {
      branding: {
        logo_url: logoUrl,
        primary_color: primaryColor,
      },
      labels,
      locale,
      map: {
        fallback_center: {
          lat: Number(draft.map.fallback_center.lat),
          lon: Number(draft.map.fallback_center.lon),
        },
        fallback_zoom: Number(draft.map.fallback_zoom),
        marker_density: {
          full_density_zoom: Number(draft.map.marker_density.full_density_zoom),
          marker_viewport_area: Number(draft.map.marker_density.marker_viewport_area),
          max_zoom_fill_ratio: Number(draft.map.marker_density.max_zoom_fill_ratio),
          min_zoom: Number(draft.map.marker_density.min_zoom),
          min_zoom_fill_ratio: Number(draft.map.marker_density.min_zoom_fill_ratio),
          zoom_curve: Number(draft.map.marker_density.zoom_curve),
        },
        marker_priority: {
          editorial_weight_multiplier: Number(draft.map.marker_priority.editorial_weight_multiplier),
          memory_count_multiplier: Number(draft.map.marker_priority.memory_count_multiplier),
          photo_count_sqrt_multiplier: Number(draft.map.marker_priority.photo_count_sqrt_multiplier),
          score_multiplier: Number(draft.map.marker_priority.score_multiplier),
        },
        marker_scale: {
          base_size: {
            height: Number(draft.map.marker_scale.base_size.height),
            width: Number(draft.map.marker_scale.base_size.width),
          },
          max_render_scale: Number(draft.map.marker_scale.max_render_scale),
          min_render_scale: Number(draft.map.marker_scale.min_render_scale),
          priority: {
            curve: Number(draft.map.marker_scale.priority.curve),
            max_scale: Number(draft.map.marker_scale.priority.max_scale),
            min_scale: Number(draft.map.marker_scale.priority.min_scale),
          },
        },
      },
      place_custom_fields: customFields,
      product_name: productName,
    },
  };
}

export function suggestCustomFieldKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 64);
}

function appConfigLabelsFromDraft(draft: AppConfigDraft, errors: string[]) {
  return Object.fromEntries(
    APP_CONFIG_LABEL_GROUPS.flatMap((group) => [
      { key: group.singularKey, label: `${group.label}: pojedyncza` },
      { key: group.pluralKey, label: `${group.label}: mnoga` },
    ]).map(({ key, label }) => {
      const value = draft.labels[key]?.trim() ?? "";
      if (!value) {
        errors.push(`Etykieta "${label}" jest wymagana.`);
      }
      return [key, value];
    }),
  );
}

function customFieldDefinitionsFromDraft(
  fields: AppConfigCustomFieldDraft[],
  errors: string[],
): PlaceCustomFieldDefinition[] {
  const seenKeys = new Set<string>();
  return fields
    .map((field, index) => customFieldDefinitionFromDraft(field, index, seenKeys, errors))
    .filter((field): field is PlaceCustomFieldDefinition => field !== null)
    .sort((firstField, secondField) => firstField.sort_order - secondField.sort_order);
}

function customFieldDefinitionFromDraft(
  field: AppConfigCustomFieldDraft,
  index: number,
  seenKeys: Set<string>,
  errors: string[],
): PlaceCustomFieldDefinition | null {
  const label = field.label.trim();
  const key = (field.key.trim() || suggestCustomFieldKey(label)).trim();
  const context = label || key || `Pole ${index + 1}`;

  if (!label) {
    errors.push(`${context}: nazwa pola jest wymagana.`);
  }
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(key)) {
    errors.push(`${context}: klucz musi używać małych liter, cyfr i podkreśleń.`);
  }
  if (seenKeys.has(key)) {
    errors.push(`${context}: klucz pola jest zdublowany.`);
  }
  seenKeys.add(key);

  const options = field.type === "select" ? selectOptionsFromText(field.optionsText, context, errors) : null;
  return {
    key,
    label,
    options,
    public: field.public,
    required: field.required,
    sort_order: Number(field.sort_order) || 0,
    type: field.type,
  };
}

function selectOptionsFromText(optionsText: string, context: string, errors: string[]): string[] {
  const options = optionsText
    .split(/\r?\n|,/)
    .map((option) => option.trim())
    .filter(Boolean);
  const uniqueOptions = [...new Set(options)];
  if (uniqueOptions.length === 0) {
    errors.push(`${context}: lista wyboru musi mieć przynajmniej jedną opcję.`);
  }
  if (uniqueOptions.length !== options.length) {
    errors.push(`${context}: opcje listy wyboru nie mogą się powtarzać.`);
  }
  return uniqueOptions;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isFiniteMapNumber(value: number, min: number, max: number): boolean {
  return Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
}

function validateMapSettings(draft: AppConfigDraft, errors: string[]) {
  const { marker_density: density, marker_priority: priority, marker_scale: scale } = draft.map;

  if (!isIntegerInRange(scale.base_size.width, 32, 240)) {
    errors.push("Szerokość kafla miejsca musi być liczbą całkowitą od 32 do 240 px.");
  }
  if (!isIntegerInRange(scale.base_size.height, 24, 220)) {
    errors.push("Wysokość kafla miejsca musi być liczbą całkowitą od 24 do 220 px.");
  }
  if (!isFiniteMapNumber(scale.min_render_scale, 0.25, 3)) {
    errors.push("Minimalna skala kafla musi być od 0.25 do 3.");
  }
  if (!isFiniteMapNumber(scale.max_render_scale, 0.25, 3)) {
    errors.push("Maksymalna skala kafla musi być od 0.25 do 3.");
  }
  if (Number(scale.min_render_scale) > Number(scale.max_render_scale)) {
    errors.push("Minimalna skala kafla nie może być większa niż maksymalna.");
  }
  if (!isFiniteMapNumber(scale.priority.min_scale, 0.25, 3)) {
    errors.push("Skala niskiego priorytetu musi być od 0.25 do 3.");
  }
  if (!isFiniteMapNumber(scale.priority.max_scale, 0.25, 3)) {
    errors.push("Skala wysokiego priorytetu musi być od 0.25 do 3.");
  }
  if (Number(scale.priority.min_scale) > Number(scale.priority.max_scale)) {
    errors.push("Skala niskiego priorytetu nie może być większa niż wysokiego.");
  }
  if (!isFiniteMapNumber(scale.priority.curve, 0.25, 3)) {
    errors.push("Krzywa priorytetu kafla musi być od 0.25 do 3.");
  }

  if (!isIntegerInRange(density.marker_viewport_area, 3_000, 80_000)) {
    errors.push("Powierzchnia ekranu na kafel musi być liczbą całkowitą od 3000 do 80000 px.");
  }
  if (!isFiniteMapNumber(density.min_zoom, 1, 20)) {
    errors.push("Zoom startowy gęstości musi być od 1 do 20.");
  }
  if (!isFiniteMapNumber(density.full_density_zoom, 1, 20)) {
    errors.push("Zoom pełnej gęstości musi być od 1 do 20.");
  }
  if (Number(density.min_zoom) > Number(density.full_density_zoom)) {
    errors.push("Zoom startowy gęstości nie może być większy niż zoom pełnej gęstości.");
  }
  if (!isFiniteMapNumber(density.min_zoom_fill_ratio, 0.02, 1.5)) {
    errors.push("Minimalne wypełnienie mapy musi być od 0.02 do 1.5.");
  }
  if (!isFiniteMapNumber(density.max_zoom_fill_ratio, 0.02, 1.5)) {
    errors.push("Maksymalne wypełnienie mapy musi być od 0.02 do 1.5.");
  }
  if (Number(density.min_zoom_fill_ratio) > Number(density.max_zoom_fill_ratio)) {
    errors.push("Minimalne wypełnienie mapy nie może być większe niż maksymalne.");
  }
  if (!isFiniteMapNumber(density.zoom_curve, 0.25, 4)) {
    errors.push("Krzywa gęstości musi być od 0.25 do 4.");
  }

  if (!isFiniteMapNumber(priority.editorial_weight_multiplier, 0, 100)) {
    errors.push("Waga priorytetu redakcji musi być od 0 do 100.");
  }
  if (!isFiniteMapNumber(priority.photo_count_sqrt_multiplier, 0, 100)) {
    errors.push("Waga liczby zdjęć musi być od 0 do 100.");
  }
  if (!isFiniteMapNumber(priority.memory_count_multiplier, 0, 100)) {
    errors.push("Waga pamiątek musi być od 0 do 100.");
  }
  if (!isFiniteMapNumber(priority.score_multiplier, 0, 100)) {
    errors.push("Waga score musi być od 0 do 100.");
  }
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
}
