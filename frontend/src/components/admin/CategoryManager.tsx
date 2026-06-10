import { useMemo, useState } from "react";

import {
  archiveCategory,
  createCategory,
  deleteCategoryPermanently,
  updateCategory,
  type Category,
  type CategoryPayload,
  type CategoryStatus,
  type Place,
} from "../../api/client";
import { ErrorModal, errorDetails, type OperationError } from "../ui/ErrorModal";
import { SystemModal } from "./SystemModal";

type Props = {
  categories: Category[];
  places: Place[];
  onChanged: () => Promise<void>;
};

type CategoryAction = {
  category: Category;
  type: "archive" | "delete";
};

const INITIAL_STATUS: CategoryStatus = "active";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function categoryPayload({
  description,
  icon,
  id,
  label,
  sortOrder,
  status,
}: {
  description: string;
  icon: string;
  id: string;
  label: string;
  sortOrder: string;
  status: CategoryStatus;
}): CategoryPayload {
  return {
    id,
    label: label.trim(),
    description: description.trim() || null,
    icon: icon.trim() || null,
    sort_order: Number(sortOrder),
    status,
  };
}

export function CategoryManager({ categories, onChanged, places }: Props) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [status, setStatus] = useState<CategoryStatus>(INITIAL_STATUS);
  const [categoryAction, setCategoryAction] = useState<CategoryAction | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);

  const generatedId = useMemo(() => slugify(label), [label]);
  const categoryId = editingCategory ? editingCategory.id : id || generatedId;
  const categoryBlockers = categoryAction
    ? places.filter((place) => place.category_id === categoryAction.category.id)
    : [];
  const categoryBlockerDetails = categoryBlockers.length
    ? categoryBlockers.map((place) => `- ${place.title} (${place.status})`).join("\n")
    : null;
  const categoryStatusCounts = useMemo(
    () => ({
      active: categories.filter((category) => category.status === "active").length,
      archived: categories.filter((category) => category.status === "archived").length,
    }),
    [categories],
  );

  function resetForm() {
    setEditingCategory(null);
    setId("");
    setLabel("");
    setDescription("");
    setIcon("");
    setSortOrder("0");
    setStatus(INITIAL_STATUS);
  }

  function openCreateCategoryModal() {
    resetForm();
    setIsCategoryModalOpen(true);
  }

  function openEditCategoryModal(category: Category) {
    setEditingCategory(category);
    setId(category.id);
    setLabel(category.label);
    setDescription(category.description ?? "");
    setIcon(category.icon ?? "");
    setSortOrder(String(category.sort_order));
    setStatus(category.status);
    setIsCategoryModalOpen(true);
  }

  function handleCloseCategoryModal() {
    if (isSaving) {
      return;
    }
    setIsCategoryModalOpen(false);
    resetForm();
  }

  async function handleSaveCategory() {
    if (!categoryId || !label.trim()) {
      return;
    }

    setOperationError(null);
    setIsSaving(true);
    try {
      const payload = categoryPayload({
        description,
        icon,
        id: categoryId,
        label,
        sortOrder,
        status,
      });

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          label: payload.label,
          description: payload.description,
          icon: payload.icon,
          sort_order: payload.sort_order,
          status: payload.status,
        });
      } else {
        await createCategory(payload);
      }

      setIsCategoryModalOpen(false);
      resetForm();
      await onChanged();
    } catch (reason) {
      setOperationError({
        details: errorDetails(reason),
        message: "Nie udało się zapisać kategorii. Sprawdź dane i spróbuj ponownie.",
        title: "Nie udało się zapisać kategorii",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmCategoryAction() {
    if (!categoryAction) {
      return;
    }

    setOperationError(null);
    setIsProcessingAction(true);
    try {
      if (categoryAction.type === "archive") {
        await archiveCategory(categoryAction.category.id);
      } else {
        await deleteCategoryPermanently(categoryAction.category.id);
      }
      if (editingCategory?.id === categoryAction.category.id) {
        setIsCategoryModalOpen(false);
        resetForm();
      }
      setCategoryAction(null);
      await onChanged();
    } catch (reason) {
      const failedAction = categoryAction.type;
      setCategoryAction(null);
      setOperationError({
        details: categoryBlockerDetails ?? errorDetails(reason),
        message:
          failedAction === "delete"
            ? "Nie można trwale usunąć tej kategorii. Jeśli jest używana przez miejsca, najpierw zmień kategorię tych miejsc albo użyj archiwizacji."
            : "Nie udało się zarchiwizować kategorii. Spróbuj ponownie.",
        title: failedAction === "delete" ? "Nie udało się usunąć kategorii" : "Nie udało się zarchiwizować kategorii",
      });
    } finally {
      setIsProcessingAction(false);
    }
  }

  return (
    <section className="admin-panel category-manager">
      <div className="category-toolbar">
        <div className="admin-summary-pills" aria-label="Status kategorii">
          <span>Wszystkie {categories.length}</span>
          <span>Aktywne {categoryStatusCounts.active}</span>
          <span>Archiwalne {categoryStatusCounts.archived}</span>
        </div>
        <button type="button" onClick={openCreateCategoryModal}>
          Dodaj kategorię
        </button>
      </div>

      <div className="category-list">
        {categories.map((category) => (
          <div className={editingCategory?.id === category.id ? "category-row is-selected" : "category-row"} key={category.id}>
            <div>
              <strong>{category.label}</strong>
              <span>{category.id}</span>
            </div>
            <span className={`status-badge status-badge--${category.status}`}>{category.status}</span>
            <span>{category.sort_order}</span>
            <span>{category.icon ?? "-"}</span>
            <div className="category-actions">
              <button type="button" onClick={() => openEditCategoryModal(category)}>
                Edytuj
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={category.status === "archived"}
                onClick={() => setCategoryAction({ category, type: "archive" })}
              >
                Archiwizuj
              </button>
              <button className="danger-button" type="button" onClick={() => setCategoryAction({ category, type: "delete" })}>
                Usuń trwale
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 ? <p className="notice">Brak kategorii. Dodaj pierwszą kategorię przyciskiem powyżej.</p> : null}
      </div>

      {isCategoryModalOpen ? (
        <SystemModal
          cancelLabel="Zamknij"
          confirmDisabled={!categoryId || !label.trim()}
          confirmLabel={editingCategory ? "Zapisz kategorię" : "Dodaj kategorię"}
          eyebrow="Kategorie"
          isBusy={isSaving}
          title={editingCategory ? "Edytuj kategorię" : "Dodaj kategorię"}
          onClose={handleCloseCategoryModal}
          onConfirm={handleSaveCategory}
        >
          <div className="category-form category-form--modal">
            <label>
              ID
              <input
                value={categoryId}
                disabled={Boolean(editingCategory)}
                onChange={(event) => setId(slugify(event.target.value))}
                placeholder="np. coffee"
                required
              />
            </label>
            <label>
              Nazwa
              <input value={label} onChange={(event) => setLabel(event.target.value)} required />
            </label>
            <label>
              Ikona
              <input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="np. coffee" />
            </label>
            <label>
              Kolejność
              <input type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
            </label>
            <label className="category-description-field">
              Opis
              <input value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <label>
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value as CategoryStatus)}>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </label>
          </div>
        </SystemModal>
      ) : null}

      {categoryAction ? (
        <SystemModal
          confirmLabel={categoryAction.type === "archive" ? "Archiwizuj" : "Usuń trwale"}
          isBusy={isProcessingAction}
          message={
            categoryAction.type === "archive"
              ? `Kategoria "${categoryAction.category.label}" zniknie z publicznych formularzy i list, ale zostanie w bazie.`
              : categoryBlockers.length > 0
                ? `Kategoria "${categoryAction.category.label}" jest używana przez ${categoryBlockers.length} miejsc. Trwałe usunięcie będzie zablokowane, dopóki nie zmienisz kategorii tych miejsc.`
                : `Kategoria "${categoryAction.category.label}" zostanie fizycznie usunięta.`
          }
          details={categoryAction.type === "delete" ? categoryBlockerDetails : null}
          title={categoryAction.type === "archive" ? "Archiwizować kategorię?" : "Usunąć kategorię trwale?"}
          tone="danger"
          onClose={() => setCategoryAction(null)}
          onConfirm={handleConfirmCategoryAction}
        />
      ) : null}
      {operationError ? <ErrorModal {...operationError} onClose={() => setOperationError(null)} /> : null}
    </section>
  );
}
