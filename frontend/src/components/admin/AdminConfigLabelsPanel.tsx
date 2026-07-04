import type { AppConfigDraft, AppConfigLabelKey } from "./appConfigForm";
import { APP_CONFIG_LABEL_GROUPS } from "./appConfigForm";

type Props = {
  labels: AppConfigDraft["labels"];
  onLabelChange: (key: AppConfigLabelKey, value: string) => void;
};

export function AdminConfigLabelsPanel({ labels, onLabelChange }: Props) {
  return (
    <fieldset className="ui-fieldset admin-config-panel admin-config-labels">
      <legend>Słownictwo</legend>
      <div className="admin-config-label-header" aria-hidden="true">
        <span />
        <span>Pojedyncza</span>
        <span>Mnoga</span>
      </div>
      {APP_CONFIG_LABEL_GROUPS.map((group) => (
        <div className="admin-config-label-group" key={group.singularKey}>
          <span className="admin-config-label-group-title">{group.label}</span>
          <div className="admin-config-label-value">
            <span className="admin-config-label-inline">Pojedyncza</span>
            <input
              aria-label={`${group.label}: pojedyncza`}
              value={labels[group.singularKey] ?? ""}
              onChange={(event) => onLabelChange(group.singularKey, event.target.value)}
            />
          </div>
          <div className="admin-config-label-value">
            <span className="admin-config-label-inline">Mnoga</span>
            <input
              aria-label={`${group.label}: mnoga`}
              value={labels[group.pluralKey] ?? ""}
              onChange={(event) => onLabelChange(group.pluralKey, event.target.value)}
            />
          </div>
        </div>
      ))}
    </fieldset>
  );
}
