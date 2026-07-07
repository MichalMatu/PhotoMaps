import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";

import type { AppConfig } from "../../api/types";
import { ErrorModal } from "../ui/ErrorModal";
import { AdminConfigBrandingPanel } from "./AdminConfigBrandingPanel";
import { AdminConfigCustomFieldsPanel } from "./AdminConfigCustomFieldsPanel";
import { AdminConfigLabelsPanel } from "./AdminConfigLabelsPanel";
import { AdminConfigMapPanel } from "./AdminConfigMapPanel";
import { AdminConfigProductPanel } from "./AdminConfigProductPanel";
import { AdminMaintenancePanel } from "./AdminMaintenancePanel";
import { AdminSegmentedControl } from "./AdminSegmentedControl";
import { SystemModal } from "./SystemModal";
import { useAdminConfigDraft } from "./useAdminConfigDraft";

type ConfigurationSection = "application" | "map" | "place-fields" | "maintenance";

type Props = {
  appConfig: AppConfig;
  onPlacesChanged: () => Promise<void>;
  onSaved: (config: AppConfig) => void;
};

export function AdminConfigurationSection({ appConfig, onPlacesChanged, onSaved }: Props) {
  const [activeSection, setActiveSection] = useState<ConfigurationSection>("application");
  const configDraft = useAdminConfigDraft({ appConfig, onPlacesChanged, onSaved });
  const { draft } = configDraft;
  const pendingFieldRemoval = configDraft.pendingFieldRemoval;

  return (
    <section className="admin-section admin-section-single admin-config-section">
      <AdminSegmentedControl
        activeKey={activeSection}
        ariaLabel="Sekcje konfiguracji"
        items={[
          { key: "application", label: "Aplikacja" },
          { key: "map", label: "Mapa" },
          { key: "place-fields", label: "Pola miejsc" },
          { key: "maintenance", label: "Utrzymanie" },
        ]}
        onChange={setActiveSection}
      />

      {activeSection !== "maintenance" ? (
        <form className="ui-form admin-config-form" onSubmit={configDraft.handleSubmit}>
          {activeSection === "application" ? (
            <div className="admin-config-grid admin-config-grid--application">
              <AdminConfigProductPanel
                locale={draft.locale}
                productName={draft.product_name}
                onLocaleChange={configDraft.updateLocale}
                onProductNameChange={configDraft.updateProductName}
              />
              <AdminConfigBrandingPanel
                colorInputValue={configDraft.colorInputValue}
                logoUrl={draft.branding.logo_url ?? ""}
                primaryColor={draft.branding.primary_color}
                onLogoUrlChange={configDraft.updateLogoUrl}
                onPrimaryColorChange={configDraft.updatePrimaryColor}
              />
              <AdminConfigLabelsPanel labels={draft.labels} onLabelChange={configDraft.updateLabel} />
            </div>
          ) : null}

          {activeSection === "map" ? (
            <AdminConfigMapPanel
              map={draft.map}
              onCenterChange={configDraft.updateMapCenter}
              onMarkerBaseSizeChange={configDraft.updateMapMarkerBaseSize}
              onMarkerDensityChange={configDraft.updateMapMarkerDensity}
              onMarkerPriorityChange={configDraft.updateMapMarkerPriority}
              onMarkerPriorityScaleChange={configDraft.updateMapMarkerPriorityScale}
              onMarkerRenderScaleChange={configDraft.updateMapMarkerRenderScale}
              onZoomChange={configDraft.updateMapZoom}
            />
          ) : null}

          {activeSection === "place-fields" ? (
            <AdminConfigCustomFieldsPanel
              fields={draft.place_custom_fields}
              onAddField={configDraft.addCustomField}
              onFieldChange={configDraft.updateCustomField}
              onFieldLabelChange={configDraft.updateCustomFieldLabel}
              onRequestRemoveField={configDraft.requestRemoveCustomField}
            />
          ) : null}

          {configDraft.formErrors.length > 0 ? (
            <div className="ui-error admin-config-errors" role="alert">
              {configDraft.formErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
          {configDraft.saveMessage ? (
            <p className="ui-help admin-config-feedback" role="status">
              {configDraft.saveMessage}
            </p>
          ) : null}

          <div className="admin-config-actions">
            <button
              className="ui-button ui-button--ghost"
              type="button"
              disabled={configDraft.isSaving}
              onClick={configDraft.resetDraft}
            >
              <RotateCcw aria-hidden="true" size={16} />
              Cofnij
            </button>
            <button className="ui-button ui-button--primary" type="submit" disabled={configDraft.isSaving}>
              <Save aria-hidden="true" size={16} />
              {configDraft.isSaving ? "Zapisywanie..." : "Zapisz konfigurację"}
            </button>
          </div>
        </form>
      ) : null}

      {activeSection === "maintenance" ? <AdminMaintenancePanel /> : null}

      {activeSection === "place-fields" && pendingFieldRemoval ? (
        <SystemModal
          confirmLabel="Usuń pole"
          message={`Pole "${pendingFieldRemoval.field.label}" zostanie usunięte z konfiguracji, a jego wartości znikną ze wszystkich miejsc po zapisie konfiguracji.`}
          title="Usunąć pole miejsc?"
          tone="danger"
          onClose={configDraft.clearPendingFieldRemoval}
          onConfirm={() => configDraft.confirmRemoveCustomField(pendingFieldRemoval.index)}
        />
      ) : null}

      {activeSection !== "maintenance" && configDraft.operationError ? (
        <ErrorModal {...configDraft.operationError} onClose={configDraft.clearOperationError} />
      ) : null}
    </section>
  );
}
