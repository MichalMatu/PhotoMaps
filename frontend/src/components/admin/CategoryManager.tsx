import { Archive, Pencil, Plus, Trash2 } from "lucide-react";

import type { Category } from "../../api/types";
import { AdminActionIconButton } from "./AdminActionIconButton";
import { AdminToolbar } from "./AdminToolbar";
import { ErrorModal } from "../ui/ErrorModal";
import { CategoryFormModal } from "./CategoryFormModal";
import { adminCategoryStatusLabel } from "./adminStatusUi";
import { SystemModal } from "./SystemModal";
import type { CategoryActions } from "./useCategoryActions";

type Props = {
  categoryActions: CategoryActions;
  categories: Category[];
  emptyMessage?: string;
  mode: "with-toolbar" | "list-only";
};

export function CategoryManager({
  categories,
  categoryActions,
  emptyMessage = "Brak kategorii. Dodaj pierwszą kategorię przyciskiem powyżej.",
  mode,
}: Props) {
  return (
    <section className="category-manager">
      {mode === "with-toolbar" ? (
        <AdminToolbar
          primary={
            <div className="admin-summary-pills" aria-label="Status kategorii">
              <span className="admin-summary-pill">Wszystkie {categories.length}</span>
              <span className="admin-summary-pill">Aktywne {categoryActions.categoryStatusCounts.active}</span>
              <span className="admin-summary-pill">Archiwalne {categoryActions.categoryStatusCounts.archived}</span>
            </div>
          }
          actions={{
            primary: (
              <AdminActionIconButton
                icon={Plus}
                label="Dodaj kategorię"
                tone="primary"
                onClick={categoryActions.openCreateCategoryModal}
              />
            ),
          }}
        />
      ) : null}

      <div className="ui-panel category-list" role="list">
        {categories.map((category) => (
          <div
            className={
              categoryActions.editingCategory?.id === category.id ? "category-row is-selected" : "category-row"
            }
            role="listitem"
            key={category.id}
          >
            <div className="category-cell category-cell--title">
              <strong>{category.label}</strong>
              <span className="category-id">{category.id}</span>
            </div>
            <div className="category-meta">
              <span className={`ui-status ui-status--${category.status}`}>
                {adminCategoryStatusLabel(category.status)}
              </span>
              <span className="category-chip">Kolejność {category.sort_order}</span>
              <span className="category-chip">{category.icon ?? "Bez ikony"}</span>
            </div>
            <div className="category-actions">
              <AdminActionIconButton
                icon={Pencil}
                label={`Edytuj kategorię ${category.label}`}
                tone="primary"
                onClick={() => categoryActions.openEditCategoryModal(category)}
              />
              <AdminActionIconButton
                disabled={category.status === "archived"}
                icon={Archive}
                label={`Archiwizuj kategorię ${category.label}`}
                tone="secondary"
                onClick={() => categoryActions.setCategoryAction({ category, type: "archive" })}
              />
              <AdminActionIconButton
                icon={Trash2}
                label={`Usuń kategorię ${category.label}`}
                tone="danger"
                onClick={() => categoryActions.setCategoryAction({ category, type: "delete" })}
              />
            </div>
          </div>
        ))}
        {categories.length === 0 ? <p className="ui-empty">{emptyMessage}</p> : null}
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
          confirmLabel={categoryActions.categoryAction.type === "archive" ? "Archiwizuj" : "Usuń"}
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
