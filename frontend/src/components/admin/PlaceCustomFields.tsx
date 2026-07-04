import type { PlaceCustomFieldDefinition } from "../../api/types";
import type { PlaceCustomFieldFormValues } from "../placeCustomFields";

type Props = {
  customFieldValues: PlaceCustomFieldFormValues;
  fields: PlaceCustomFieldDefinition[];
  onFieldChange: (key: string, value: string | boolean) => void;
};

export function PlaceCustomFields({ customFieldValues, fields, onFieldChange }: Props) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <fieldset className="place-custom-fields">
      <legend>Pola dodatkowe</legend>
      <div className="place-custom-field-grid">
        {fields.map((field) => (
          <CustomFieldInput
            definition={field}
            key={field.key}
            value={customFieldValues[field.key]}
            onChange={(value) => onFieldChange(field.key, value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function CustomFieldInput({
  definition,
  onChange,
  value,
}: {
  definition: PlaceCustomFieldDefinition;
  onChange: (value: string | boolean) => void;
  value: string | boolean | undefined;
}) {
  const inputId = `place-custom-field-${definition.key}`;
  const stringValue = typeof value === "string" ? value : "";

  if (definition.type === "boolean") {
    return (
      <label className="checkbox-field place-custom-field" htmlFor={inputId}>
        <input
          checked={value === true}
          id={inputId}
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{definition.label}</span>
      </label>
    );
  }

  if (definition.type === "textarea") {
    return (
      <label className="place-custom-field" htmlFor={inputId}>
        {definition.label}
        <textarea
          id={inputId}
          required={definition.required}
          rows={3}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (definition.type === "select") {
    return (
      <label className="place-custom-field" htmlFor={inputId}>
        {definition.label}
        <select
          id={inputId}
          required={definition.required}
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">-</option>
          {(definition.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="place-custom-field" htmlFor={inputId}>
      {definition.label}
      <input
        id={inputId}
        required={definition.required}
        step={definition.type === "number" ? "0.01" : undefined}
        type={customFieldInputType(definition.type)}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function customFieldInputType(type: PlaceCustomFieldDefinition["type"]) {
  if (type === "number" || type === "url" || type === "date") {
    return type;
  }
  return "text";
}
