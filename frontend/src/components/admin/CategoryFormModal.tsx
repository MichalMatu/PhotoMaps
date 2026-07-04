import type { FormEvent } from "react";

import type { Category, CategoryStatus } from "../../api/types";
import { ADMIN_CATEGORY_STATUS_OPTIONS } from "./adminStatusUi";
import { SystemModal } from "./SystemModal";

type Props = {
  categoryId: string;
  description: string;
  editingCategory: Category | null;
  icon: string;
  isSaving: boolean;
  label: string;
  onCategoryIdChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  onDescriptionChange: (value: string) => void;
  onIconChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  onSortOrderChange: (value: string) => void;
  onStatusChange: (value: CategoryStatus) => void;
  sortOrder: string;
  status: CategoryStatus;
};

export function CategoryFormModal({
  categoryId,
  description,
  editingCategory,
  icon,
  isSaving,
  label,
  onCategoryIdChange,
  onClose,
  onConfirm,
  onDescriptionChange,
  onIconChange,
  onLabelChange,
  onSortOrderChange,
  onStatusChange,
  sortOrder,
  status,
}: Props) {
  const canSubmit = Boolean(categoryId && label.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || isSaving) {
      return;
    }

    onConfirm();
  }

  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmDisabled={!canSubmit}
      confirmFormId="category-form-modal"
      confirmLabel={editingCategory ? "Zapisz kategorię" : "Dodaj kategorię"}
      eyebrow="Kategorie"
      isBusy={isSaving}
      title={editingCategory ? "Edytuj kategorię" : "Dodaj kategorię"}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <form id="category-form-modal" className="ui-form category-form category-form--modal" onSubmit={handleSubmit}>
        <label>
          ID
          <input
            value={categoryId}
            disabled={Boolean(editingCategory)}
            onChange={(event) => onCategoryIdChange(event.target.value)}
            placeholder="np. coffee"
            required
          />
        </label>
        <label>
          Nazwa
          <input value={label} onChange={(event) => onLabelChange(event.target.value)} required />
        </label>
        <label>
          Ikona
          <input value={icon} onChange={(event) => onIconChange(event.target.value)} placeholder="np. coffee" />
        </label>
        <label>
          Kolejność
          <input type="number" value={sortOrder} onChange={(event) => onSortOrderChange(event.target.value)} />
        </label>
        <label className="category-description-field">
          Opis
          <input value={description} onChange={(event) => onDescriptionChange(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => onStatusChange(event.target.value as CategoryStatus)}>
            {ADMIN_CATEGORY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </form>
    </SystemModal>
  );
}
