import { Plus, Trash2 } from "lucide-react";

import { AdminActionIconButton } from "./AdminActionIconButton";
import { PLACE_CUSTOM_FIELD_TYPES, type AppConfigCustomFieldDraft } from "./appConfigForm";

type Props = {
  fields: AppConfigCustomFieldDraft[];
  onAddField: () => void;
  onFieldChange: (index: number, patch: Partial<AppConfigCustomFieldDraft>) => void;
  onFieldLabelChange: (index: number, label: string) => void;
  onRequestRemoveField: (index: number) => void;
};

export function AdminConfigCustomFieldsPanel({
  fields,
  onAddField,
  onFieldChange,
  onFieldLabelChange,
  onRequestRemoveField,
}: Props) {
  return (
    <fieldset className="ui-fieldset admin-config-fields">
      <legend>Pola miejsc</legend>
      <div className="admin-config-field-list">
        {fields.map((field, index) => (
          <div className="admin-config-field-row" key={`${field.key || "new"}-${index}`}>
            <div className="admin-config-field-main">
              <label>
                Etykieta
                <input value={field.label} onChange={(event) => onFieldLabelChange(index, event.target.value)} />
              </label>
              <label>
                Klucz
                <input
                  disabled={!field.isNew}
                  value={field.key}
                  onChange={(event) => onFieldChange(index, { key: event.target.value })}
                />
              </label>
              <label>
                Typ
                <select
                  disabled={!field.isNew}
                  value={field.type}
                  onChange={(event) =>
                    onFieldChange(index, {
                      type: event.target.value as AppConfigCustomFieldDraft["type"],
                    })
                  }
                >
                  {PLACE_CUSTOM_FIELD_TYPES.map((fieldType) => (
                    <option key={fieldType.key} value={fieldType.key}>
                      {fieldType.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Kolejność
                <input
                  type="number"
                  value={field.sort_order}
                  onChange={(event) => onFieldChange(index, { sort_order: Number(event.target.value) })}
                />
              </label>
            </div>
            {field.type === "select" ? (
              <label className="admin-config-field-options">
                Opcje
                <textarea
                  value={field.optionsText}
                  rows={3}
                  onChange={(event) => onFieldChange(index, { optionsText: event.target.value })}
                />
              </label>
            ) : null}
            <div className="admin-config-field-footer">
              <div className="admin-config-field-switches">
                <label className="checkbox-field admin-config-checkbox">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) => onFieldChange(index, { required: event.target.checked })}
                  />
                  Wymagane
                </label>
                <label className="checkbox-field admin-config-checkbox">
                  <input
                    type="checkbox"
                    checked={field.public}
                    onChange={(event) => onFieldChange(index, { public: event.target.checked })}
                  />
                  Publiczne
                </label>
              </div>
              <AdminActionIconButton
                icon={Trash2}
                label={`Usuń pole ${field.label || field.key || index + 1}`}
                tone="danger"
                onClick={() => onRequestRemoveField(index)}
              />
            </div>
          </div>
        ))}
      </div>
      <button className="ui-button ui-button--secondary admin-config-add-field" type="button" onClick={onAddField}>
        <Plus aria-hidden="true" size={16} />
        Dodaj pole
      </button>
    </fieldset>
  );
}
