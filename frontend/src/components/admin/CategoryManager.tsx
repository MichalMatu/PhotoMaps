import type { Category, Place } from "../../api/client";
import { ErrorModal } from "../ui/ErrorModal";
import { CategoryFormModal } from "./CategoryFormModal";
import { SystemModal } from "./SystemModal";
import { useCategoryActions } from "./useCategoryActions";

type Props = {
  categories: Category[];
  onChanged: () => Promise<void>;
  places: Place[];
};

export function CategoryManager({ categories, onChanged, places }: Props) {
  const categoryActions = useCategoryActions({ categories, onChanged, places });

  return (
    <section className="admin-panel category-manager">
      <div className="category-toolbar">
        <div className="admin-summary-pills" aria-label="Status kategorii">
          <span>Wszystkie {categories.length}</span>
          <span>Aktywne {categoryActions.categoryStatusCounts.active}</span>
          <span>Archiwalne {categoryActions.categoryStatusCounts.archived}</span>
        </div>
        <button type="button" onClick={categoryActions.openCreateCategoryModal}>
          Dodaj kategorię
        </button>
      </div>

      <div className="category-list">
        {categories.map((category) => (
          <div
            className={
              categoryActions.editingCategory?.id === category.id ? "category-row is-selected" : "category-row"
            }
            key={category.id}
          >
            <div>
              <strong>{category.label}</strong>
              <span>{category.id}</span>
            </div>
            <span className={`status-badge status-badge--${category.status}`}>{category.status}</span>
            <span>{category.sort_order}</span>
            <span>{category.icon ?? "-"}</span>
            <div className="category-actions">
              <button type="button" onClick={() => categoryActions.openEditCategoryModal(category)}>
                Edytuj
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={category.status === "archived"}
                onClick={() => categoryActions.setCategoryAction({ category, type: "archive" })}
              >
                Archiwizuj
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => categoryActions.setCategoryAction({ category, type: "delete" })}
              >
                Usuń trwale
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 ? (
          <p className="notice">Brak kategorii. Dodaj pierwszą kategorię przyciskiem powyżej.</p>
        ) : null}
      </div>

      {categoryActions.isCategoryModalOpen ? (
        <CategoryFormModal
          categoryId={categoryActions.categoryId}
          description={categoryActions.description}
          editingCategory={categoryActions.editingCategory}
          icon={categoryActions.icon}
          isSaving={categoryActions.isSaving}
          label={categoryActions.label}
          sortOrder={categoryActions.sortOrder}
          status={categoryActions.status}
          onCategoryIdChange={categoryActions.setId}
          onClose={categoryActions.handleCloseCategoryModal}
          onConfirm={categoryActions.handleSaveCategory}
          onDescriptionChange={categoryActions.setDescription}
          onIconChange={categoryActions.setIcon}
          onLabelChange={categoryActions.setLabel}
          onSortOrderChange={categoryActions.setSortOrder}
          onStatusChange={categoryActions.setStatus}
        />
      ) : null}

      {categoryActions.categoryAction ? (
        <SystemModal
          confirmLabel={categoryActions.categoryAction.type === "archive" ? "Archiwizuj" : "Usuń trwale"}
          isBusy={categoryActions.isProcessingAction}
          message={
            categoryActions.categoryAction.type === "archive"
              ? `Kategoria "${categoryActions.categoryAction.category.label}" zniknie z publicznych formularzy i list, ale zostanie w bazie.`
              : categoryActions.categoryBlockers.length > 0
                ? `Kategoria "${categoryActions.categoryAction.category.label}" jest używana przez ${categoryActions.categoryBlockers.length} miejsc. Trwałe usunięcie będzie zablokowane, dopóki nie zmienisz kategorii tych miejsc.`
                : `Kategoria "${categoryActions.categoryAction.category.label}" zostanie fizycznie usunięta.`
          }
          details={categoryActions.categoryAction.type === "delete" ? categoryActions.categoryBlockerDetails : null}
          title={
            categoryActions.categoryAction.type === "archive" ? "Archiwizować kategorię?" : "Usunąć kategorię trwale?"
          }
          tone="danger"
          onClose={() => categoryActions.setCategoryAction(null)}
          onConfirm={categoryActions.handleConfirmCategoryAction}
        />
      ) : null}
      {categoryActions.operationError ? (
        <ErrorModal {...categoryActions.operationError} onClose={() => categoryActions.setOperationError(null)} />
      ) : null}
    </section>
  );
}
