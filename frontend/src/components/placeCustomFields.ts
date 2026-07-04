import type {
  PlaceCustomFieldDefinition,
  PlaceCustomFields,
  PlaceCustomFieldType,
  PlaceCustomFieldValue,
} from "../api/types";

export type PlaceCustomFieldFormValues = Record<string, string | boolean>;

export type PlaceCustomFieldDisplayItem = {
  href: string | null;
  key: string;
  label: string;
  text: string;
  type: PlaceCustomFieldType;
};

export function sortedPlaceCustomFieldDefinitions(definitions: PlaceCustomFieldDefinition[]) {
  return [...definitions].sort((firstField, secondField) => firstField.sort_order - secondField.sort_order);
}

export function placeCustomFieldFormValues(
  definitions: PlaceCustomFieldDefinition[],
  customFields: PlaceCustomFields,
): PlaceCustomFieldFormValues {
  return Object.fromEntries(
    sortedPlaceCustomFieldDefinitions(definitions).map((definition) => {
      const value = customFields[definition.key];
      return [definition.key, definition.type === "boolean" ? value === true : customFieldValueText(value)];
    }),
  );
}

export function placeCustomFieldPayload(
  definitions: PlaceCustomFieldDefinition[],
  formValues: PlaceCustomFieldFormValues,
): PlaceCustomFields {
  const payload: PlaceCustomFields = {};
  sortedPlaceCustomFieldDefinitions(definitions).forEach((definition) => {
    const value = formValues[definition.key];
    if (definition.type === "boolean") {
      if (value === true) {
        payload[definition.key] = true;
      }
      return;
    }

    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
      return;
    }
    payload[definition.key] = definition.type === "number" ? normalized.replace(",", ".") : normalized;
  });
  return payload;
}

export function publicPlaceCustomFieldDisplayItems(
  definitions: PlaceCustomFieldDefinition[],
  customFields: PlaceCustomFields,
): PlaceCustomFieldDisplayItem[] {
  return sortedPlaceCustomFieldDefinitions(definitions)
    .filter((definition) => definition.public)
    .map((definition) => customFieldDisplayItem(definition, customFields[definition.key]))
    .filter((item): item is PlaceCustomFieldDisplayItem => item !== null);
}

function customFieldDisplayItem(
  definition: PlaceCustomFieldDefinition,
  value: PlaceCustomFieldValue | undefined,
): PlaceCustomFieldDisplayItem | null {
  const text = customFieldValueText(value);
  if (!text) {
    return null;
  }
  return {
    href: definition.type === "url" ? safeUrl(text) : null,
    key: definition.key,
    label: definition.label,
    text,
    type: definition.type,
  };
}

function customFieldValueText(value: PlaceCustomFieldValue | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "Tak" : "Nie";
  }
  return String(value).trim();
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
