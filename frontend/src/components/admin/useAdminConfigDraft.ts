import { FormEvent, useEffect, useMemo, useState } from "react";

import { updateAdminAppConfig } from "../../api/appConfig";
import type { AppConfig } from "../../api/types";
import { errorDetails, type OperationError } from "../ui/ErrorModal";
import {
  appConfigPayloadFromDraft,
  createAppConfigDraft,
  nextCustomFieldDraft,
  suggestCustomFieldKey,
  type AppConfigCustomFieldDraft,
  type AppConfigDraft,
  type AppConfigLabelKey,
} from "./appConfigForm";

export type PendingFieldRemoval = {
  field: AppConfigCustomFieldDraft;
  index: number;
};

type UseAdminConfigDraftOptions = {
  appConfig: AppConfig;
  onPlacesChanged: () => Promise<void>;
  onSaved: (config: AppConfig) => void;
};

function appConfigSaveError(reason: unknown): OperationError {
  return {
    details: errorDetails(reason),
    message: "Nie udało się zapisać konfiguracji produktu. Popraw dane i spróbuj ponownie.",
    title: "Nie udało się zapisać konfiguracji",
  };
}

export function useAdminConfigDraft({ appConfig, onPlacesChanged, onSaved }: UseAdminConfigDraftOptions) {
  const [draft, setDraft] = useState<AppConfigDraft>(() => createAppConfigDraft(appConfig));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [pendingFieldRemoval, setPendingFieldRemoval] = useState<PendingFieldRemoval | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const existingFieldKeys = useMemo(
    () => new Set(appConfig.place_custom_fields.map((field) => field.key)),
    [appConfig.place_custom_fields],
  );
  const colorInputValue = /^#[0-9a-fA-F]{6}$/.test(draft.branding.primary_color)
    ? draft.branding.primary_color
    : "#000000";

  useEffect(() => {
    setDraft(createAppConfigDraft(appConfig));
    setFormErrors([]);
    setSaveMessage(null);
  }, [appConfig]);

  function updateProductName(productName: string) {
    setDraft((current) => ({ ...current, product_name: productName }));
  }

  function updateLocale(locale: string) {
    setDraft((current) => ({ ...current, locale }));
  }

  function updatePrimaryColor(primaryColor: string) {
    setDraft((current) => ({
      ...current,
      branding: { ...current.branding, primary_color: primaryColor },
    }));
  }

  function updateLogoUrl(logoUrl: string) {
    setDraft((current) => ({
      ...current,
      branding: { ...current.branding, logo_url: logoUrl },
    }));
  }

  function updateLabel(key: AppConfigLabelKey, value: string) {
    setDraft((current) => ({
      ...current,
      labels: {
        ...current.labels,
        [key]: value,
      },
    }));
  }

  function updateMapCenter(axis: "lat" | "lon", value: number) {
    setDraft((current) => ({
      ...current,
      map: {
        ...current.map,
        fallback_center: {
          ...current.map.fallback_center,
          [axis]: value,
        },
      },
    }));
  }

  function updateMapZoom(zoom: number) {
    setDraft((current) => ({
      ...current,
      map: { ...current.map, fallback_zoom: zoom },
    }));
  }

  function updateMapMarkerBaseSize(axis: "height" | "width", value: number) {
    setDraft((current) => ({
      ...current,
      map: {
        ...current.map,
        marker_scale: {
          ...current.map.marker_scale,
          base_size: {
            ...current.map.marker_scale.base_size,
            [axis]: value,
          },
        },
      },
    }));
  }

  function updateMapMarkerRenderScale(key: "max_render_scale" | "min_render_scale", value: number) {
    setDraft((current) => ({
      ...current,
      map: {
        ...current.map,
        marker_scale: {
          ...current.map.marker_scale,
          [key]: value,
        },
      },
    }));
  }

  function updateMapMarkerPriorityScale(key: "curve" | "max_scale" | "min_scale", value: number) {
    setDraft((current) => ({
      ...current,
      map: {
        ...current.map,
        marker_scale: {
          ...current.map.marker_scale,
          priority: {
            ...current.map.marker_scale.priority,
            [key]: value,
          },
        },
      },
    }));
  }

  function updateMapMarkerDensity(
    key:
      | "full_density_zoom"
      | "marker_viewport_area"
      | "max_zoom_fill_ratio"
      | "min_zoom"
      | "min_zoom_fill_ratio"
      | "zoom_curve",
    value: number,
  ) {
    setDraft((current) => ({
      ...current,
      map: {
        ...current.map,
        marker_density: {
          ...current.map.marker_density,
          [key]: value,
        },
      },
    }));
  }

  function updateMapMarkerPriority(
    key: "editorial_weight_multiplier" | "memory_count_multiplier" | "photo_count_sqrt_multiplier" | "score_multiplier",
    value: number,
  ) {
    setDraft((current) => ({
      ...current,
      map: {
        ...current.map,
        marker_priority: {
          ...current.map.marker_priority,
          [key]: value,
        },
      },
    }));
  }

  function updateCustomField(index: number, patch: Partial<AppConfigCustomFieldDraft>) {
    setDraft((current) => ({
      ...current,
      place_custom_fields: current.place_custom_fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    }));
  }

  function updateCustomFieldLabel(index: number, label: string) {
    setDraft((current) => ({
      ...current,
      place_custom_fields: current.place_custom_fields.map((field, fieldIndex) => {
        if (fieldIndex !== index) {
          return field;
        }
        const previousSuggestion = suggestCustomFieldKey(field.label);
        const shouldSyncKey = field.isNew && (!field.key || field.key === previousSuggestion);
        return {
          ...field,
          key: shouldSyncKey ? suggestCustomFieldKey(label) : field.key,
          label,
        };
      }),
    }));
  }

  function addCustomField() {
    setDraft((current) => ({
      ...current,
      place_custom_fields: [...current.place_custom_fields, nextCustomFieldDraft(current.place_custom_fields)],
    }));
    setSaveMessage(null);
  }

  function removeCustomField(index: number) {
    setDraft((current) => ({
      ...current,
      place_custom_fields: current.place_custom_fields.filter((_field, fieldIndex) => fieldIndex !== index),
    }));
    setPendingFieldRemoval(null);
    setSaveMessage(null);
  }

  function requestRemoveCustomField(index: number) {
    const field = draft.place_custom_fields[index];
    if (!field) {
      return;
    }
    if (!field.isNew && existingFieldKeys.has(field.key)) {
      setPendingFieldRemoval({ field, index });
      return;
    }
    removeCustomField(index);
  }

  function resetDraft() {
    setDraft(createAppConfigDraft(appConfig));
    setFormErrors([]);
    setSaveMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = appConfigPayloadFromDraft(draft);
    setFormErrors(result.errors);
    setSaveMessage(null);
    if (!result.payload) {
      return;
    }

    setIsSaving(true);
    setOperationError(null);
    try {
      const updatedConfig = await updateAdminAppConfig(result.payload);
      onSaved(updatedConfig);
      await onPlacesChanged().catch(() => undefined);
      setDraft(createAppConfigDraft(updatedConfig));
      setSaveMessage("Konfiguracja zapisana.");
    } catch (reason) {
      setOperationError(appConfigSaveError(reason));
    } finally {
      setIsSaving(false);
    }
  }

  return {
    addCustomField,
    clearOperationError: () => setOperationError(null),
    clearPendingFieldRemoval: () => setPendingFieldRemoval(null),
    colorInputValue,
    confirmRemoveCustomField: removeCustomField,
    draft,
    formErrors,
    handleSubmit,
    isSaving,
    operationError,
    pendingFieldRemoval,
    requestRemoveCustomField,
    resetDraft,
    saveMessage,
    updateCustomField,
    updateCustomFieldLabel,
    updateLabel,
    updateLocale,
    updateLogoUrl,
    updateMapCenter,
    updateMapMarkerBaseSize,
    updateMapMarkerDensity,
    updateMapMarkerPriority,
    updateMapMarkerPriorityScale,
    updateMapMarkerRenderScale,
    updateMapZoom,
    updatePrimaryColor,
    updateProductName,
  };
}
