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
          <span className="admin-summary-pill">Wszystkie {categories.length}</span>
          <span className="admin-summary-pill">Aktywne {categoryActions.categoryStatusCounts.active}</span>
          <span className="admin-summary-pill">Archiwalne {categoryActions.categoryStatusCounts.archived}</span>
        </div>
        <button type="button" onClick={categoryActions.openCreateCategoryModal}>
          Dodaj kategorię
        </button>
      </div>

      <div className="ui-table-panel category-list" role="table">
        <div className="category-row category-head" role="row">
          <span className="category-cell" role="columnheader">
            Nazwa
          </span>
          <span className="category-cell" role="columnheader">
            Status
          </span>
          <span className="category-cell" role="columnheader">
            Kolejność
          </span>
          <span className="category-cell" role="columnheader">
            Ikona
          </span>
          <span className="category-cell category-cell--actions" role="columnheader">
            Akcje
          </span>
        </div>
        {categories.map((category) => (
          <div
            className={
              categoryActions.editingCategory?.id === category.id ? "category-row is-selected" : "category-row"
            }
            role="row"
            key={category.id}
          >
            <div className="category-cell category-cell--title" role="cell" data-label="Nazwa">
              <strong>{category.label}</strong>
              <span className="category-id">{category.id}</span>
            </div>
            <span className="category-cell" role="cell" data-label="Status">
              <span className={`ui-status ui-status--${category.status}`}>{category.status}</span>
            </span>
            <span className="category-cell" role="cell" data-label="Kolejność">
              {category.sort_order}
            </span>
            <span className="category-cell category-cell--icon" role="cell" data-label="Ikona">
              {category.icon ?? "-"}
            </span>
            <div className="category-cell category-cell--actions category-actions" role="cell">
              <button type="button" onClick={() => categoryActions.openEditCategoryModal(category)}>
                Edytuj
              </button>
              <button
                className="ui-button ui-button--secondary"
                type="button"
                disabled={category.status === "archived"}
                onClick={() => categoryActions.setCategoryAction({ category, type: "archive" })}
              >
                Archiwizuj
              </button>
              <button
                className="ui-button ui-button--danger"
                type="button"
                onClick={() => categoryActions.setCategoryAction({ category, type: "delete" })}
              >
                Usuń trwale
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 ? (
          <p className="ui-empty">Brak kategorii. Dodaj pierwszą kategorię przyciskiem powyżej.</p>
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
