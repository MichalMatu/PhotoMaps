import type { Category } from "../../api/types";

type Props = {
  categories: Category[];
  categoryIds: string[];
  onManageCategories?: () => void;
  onToggleCategory: (categoryId: string) => void;
};

export function PlaceCategoryFields({ categories, categoryIds, onManageCategories, onToggleCategory }: Props) {
  return (
    <fieldset className="category-checkboxes">
      <legend>Kategorie</legend>
      <div className="category-checkbox-grid">
        {categories.map((category) => (
          <label key={category.id}>
            <input
              type="checkbox"
              checked={categoryIds.includes(category.id)}
              onChange={() => onToggleCategory(category.id)}
            />
            <span>{category.label}</span>
          </label>
        ))}
      </div>
      {onManageCategories ? (
        <button
          className="ui-button ui-button--ghost category-manage-button"
          type="button"
          onClick={onManageCategories}
        >
          Zarządzaj kategoriami
        </button>
      ) : null}
    </fieldset>
  );
}
