import type { Category, CategoryStatus } from "../../api/client";
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
  return (
    <SystemModal
      cancelLabel="Zamknij"
      confirmDisabled={!categoryId || !label.trim()}
      confirmLabel={editingCategory ? "Zapisz kategorię" : "Dodaj kategorię"}
      eyebrow="Kategorie"
      isBusy={isSaving}
      title={editingCategory ? "Edytuj kategorię" : "Dodaj kategorię"}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="category-form category-form--modal">
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
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>
    </SystemModal>
  );
}
